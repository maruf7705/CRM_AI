"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useInboxStore } from "@/stores/inboxStore";
import { useNotificationStore } from "@/stores/notificationStore";

interface UseRealtimeInput {
  organizationId?: string | undefined;
  userId?: string | undefined;
}

interface BroadcastEnvelope<TPayload> {
  payload?: TPayload;
}

interface NewMessagePayload {
  message?: {
    id: string;
    conversationId: string;
    content?: string;
    sender?: string;
    direction?: string;
  };
  conversation?: {
    id: string;
    unreadCount?: number;
  };
}

interface ConversationUpdatePayload {
  conversationId?: string;
  updates?: {
    unreadCount?: number;
  };
}

interface TypingPayload {
  conversationId?: string;
  userId?: string;
}

interface NotificationPayload {
  notification?: {
    id: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt?: string;
  };
}

interface UnreadUpdatePayload {
  conversationId?: string;
  count?: number;
}

interface AiSuggestionPayload {
  conversationId?: string;
  suggestion?: string;
}

const SOUND_PREF_KEY = "omnidesk:inbox:sound";
const BROWSER_NOTIFICATION_PREF_KEY = "omnidesk:inbox:browserNotifications";

const shouldPlaySound = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SOUND_PREF_KEY) === "true";
};

const shouldShowBrowserNotifications = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(BROWSER_NOTIFICATION_PREF_KEY) === "true";
};

const playNotificationSound = (): void => {
  if (!shouldPlaySound()) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gainNode.gain.setValueAtTime(0.08, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);

    window.setTimeout(() => {
      void context.close();
    }, 260);
  } catch {
    return;
  }
};

const maybeShowBrowserNotification = (title: string, body: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (!shouldShowBrowserNotifications()) {
    return;
  }

  if (!("Notification" in window)) {
    return;
  }

  if (document.visibilityState === "visible") {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  void new Notification(title, { body });
};

export const useRealtime = ({ organizationId, userId }: UseRealtimeInput): void => {
  const queryClient = useQueryClient();
  const applyUnreadUpdate = useInboxStore((state) => state.applyUnreadUpdate);
  const setTyping = useInboxStore((state) => state.setTyping);
  const setAiSuggestion = useInboxStore((state) => state.setAiSuggestion);
  const clearAiSuggestion = useInboxStore((state) => state.clearAiSuggestion);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const typingTimeoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if ("Notification" in window && shouldShowBrowserNotifications() && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const invalidateConversationCollections = async (conversationId?: string): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations", organizationId] }),
        conversationId
          ? queryClient.invalidateQueries({ queryKey: ["conversation", organizationId, conversationId] })
          : Promise.resolve(),
        conversationId
          ? queryClient.invalidateQueries({ queryKey: ["messages", organizationId, conversationId] })
          : Promise.resolve(),
      ]);
    };

    const orgChannel = supabase
      .channel(`org:${organizationId}`)
      .on("broadcast", { event: "new_message" }, (raw) => {
        const payload = (raw as BroadcastEnvelope<NewMessagePayload>).payload;
        const conversationId = payload?.conversation?.id ?? payload?.message?.conversationId;
        const unreadCount = payload?.conversation?.unreadCount;

        if (conversationId && typeof unreadCount === "number") {
          applyUnreadUpdate(conversationId, unreadCount);
        }

        if (payload?.message?.sender === "CONTACT" || payload?.message?.direction === "INBOUND") {
          playNotificationSound();
          maybeShowBrowserNotification(
            "New message in OmniDesk",
            payload.message.content?.slice(0, 120) ?? "A new inbound message arrived.",
          );
        } else if (conversationId) {
          clearAiSuggestion(conversationId);
        }

        void invalidateConversationCollections(conversationId);
      })
      .on("broadcast", { event: "message_status" }, (raw) => {
        const payload = (raw as BroadcastEnvelope<{ messageId?: string; status?: string }>).payload;
        void queryClient.invalidateQueries({ queryKey: ["messages", organizationId] });
        if (payload?.messageId) {
          void queryClient.invalidateQueries({ queryKey: ["conversations", organizationId] });
        }
      })
      .on("broadcast", { event: "conversation_update" }, (raw) => {
        const payload = (raw as BroadcastEnvelope<ConversationUpdatePayload>).payload;
        const conversationId = payload?.conversationId;

        if (conversationId && typeof payload?.updates?.unreadCount === "number") {
          applyUnreadUpdate(conversationId, payload.updates.unreadCount);
        }

        void invalidateConversationCollections(conversationId);
      })
      .on("broadcast", { event: "new_conversation" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["conversations", organizationId] });
      })
      .on("broadcast", { event: "ai_processing" }, (raw) => {
        const payload = (raw as BroadcastEnvelope<{ conversationId?: string }>).payload;
        if (payload?.conversationId) {
          void invalidateConversationCollections(payload.conversationId);
        }
      })
      .on("broadcast", { event: "ai_reply" }, (raw) => {
        const payload = (raw as BroadcastEnvelope<{ conversationId?: string }>).payload;
        if (payload?.conversationId) {
          clearAiSuggestion(payload.conversationId);
          void invalidateConversationCollections(payload.conversationId);
        }
      })
      .on("broadcast", { event: "ai_error" }, (raw) => {
        const payload = (raw as BroadcastEnvelope<{ conversationId?: string }>).payload;
        if (payload?.conversationId) {
          clearAiSuggestion(payload.conversationId);
          void invalidateConversationCollections(payload.conversationId);
        }
      })
      .on("broadcast", { event: "ai_suggestion" }, (raw) => {
        const payload = (raw as BroadcastEnvelope<AiSuggestionPayload>).payload;
        if (payload?.conversationId && payload.suggestion) {
          setAiSuggestion(payload.conversationId, payload.suggestion);
        }
      })
      .on("broadcast", { event: "typing" }, (raw) => {
        const payload = (raw as BroadcastEnvelope<TypingPayload>).payload;
        const conversationId = payload?.conversationId;
        const typingUserId = payload?.userId;

        if (!conversationId || !typingUserId) {
          return;
        }

        setTyping(conversationId, typingUserId, true);

        const timeoutKey = `${conversationId}:${typingUserId}`;
        const existingTimeout = typingTimeoutsRef.current[timeoutKey];
        if (existingTimeout) {
          window.clearTimeout(existingTimeout);
        }

        typingTimeoutsRef.current[timeoutKey] = window.setTimeout(() => {
          setTyping(conversationId, typingUserId, false);
          delete typingTimeoutsRef.current[timeoutKey];
        }, 3500);
      })
      .on("broadcast", { event: "notification" }, (raw) => {
        const payload = (raw as BroadcastEnvelope<NotificationPayload>).payload;
        const notification = payload?.notification;

        if (!notification) {
          return;
        }

        addNotification({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          isRead: notification.isRead,
          createdAt: notification.createdAt ?? new Date().toISOString(),
        });

        maybeShowBrowserNotification(notification.title, notification.body);
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      })
      .on("broadcast", { event: "unread_update" }, (raw) => {
        const payload = (raw as BroadcastEnvelope<UnreadUpdatePayload>).payload;
        if (payload?.conversationId && typeof payload.count === "number") {
          applyUnreadUpdate(payload.conversationId, payload.count);
          void queryClient.invalidateQueries({ queryKey: ["conversations", organizationId] });
        }
      })
      .subscribe();

    const fallbackChannel = supabase
      .channel(`org:${organizationId}:fallback`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `organizationId=eq.${organizationId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["conversations", organizationId] });
        },
      )
      .subscribe();

    const userChannel = userId
      ? supabase
          .channel(`user:${userId}`)
          .on("broadcast", { event: "notification" }, (raw) => {
            const payload = (raw as BroadcastEnvelope<NotificationPayload>).payload;
            const notification = payload?.notification;

            if (!notification) {
              return;
            }

            addNotification({
              id: notification.id,
              title: notification.title,
              body: notification.body,
              isRead: notification.isRead,
              createdAt: notification.createdAt ?? new Date().toISOString(),
            });

            maybeShowBrowserNotification(notification.title, notification.body);
            void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          })
          .subscribe()
      : null;

    return () => {
      Object.values(typingTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      typingTimeoutsRef.current = {};

      void supabase.removeChannel(orgChannel);
      void supabase.removeChannel(fallbackChannel);
      if (userChannel) {
        void supabase.removeChannel(userChannel);
      }
    };
  }, [
    organizationId,
    userId,
    queryClient,
    applyUnreadUpdate,
    setTyping,
    setAiSuggestion,
    clearAiSuggestion,
    addNotification,
  ]);
};
