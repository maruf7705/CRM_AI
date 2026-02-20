"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/inbox/ChatWindow";
import { ContactPanel } from "@/components/inbox/ContactPanel";
import { ConversationFilters } from "@/components/inbox/ConversationFilters";
import { ConversationList } from "@/components/inbox/ConversationList";
import { EmptyInbox } from "@/components/inbox/EmptyInbox";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useContact } from "@/hooks/useContacts";
import {
  useAssignConversation,
  useConversation,
  useConversations,
  useToggleConversationAi,
} from "@/hooks/useConversations";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { flattenMessagePages, useMessages, useSendMessage } from "@/hooks/useMessages";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useOrganization } from "@/hooks/useOrganization";
import { useTeam } from "@/hooks/useTeam";
import { cn } from "@/lib/utils";
import { useInboxStore } from "@/stores/inboxStore";
import type { ChannelType, ConversationStatus } from "@/types";

const SOUND_PREF_KEY = "omnidesk:inbox:sound";
const BROWSER_NOTIFICATION_PREF_KEY = "omnidesk:inbox:browserNotifications";

type MobileView = "list" | "chat";

export default function InboxPage() {
  const router = useRouter();
  const { organizationId } = useAuth();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ConversationStatus | "">("");
  const [channel, setChannel] = useState<ChannelType | "">("");
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [draft, setDraft] = useState("");

  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>(SOUND_PREF_KEY, false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useLocalStorage<boolean>(
    BROWSER_NOTIFICATION_PREF_KEY,
    false,
  );

  const isMobile = useMediaQuery("(max-width: 1023px)");
  const debouncedSearch = useDebounce(search, 250);

  const selectedConversationId = useInboxStore((state) => state.selectedConversationId);
  const setSelectedConversationId = useInboxStore((state) => state.setSelectedConversationId);
  const syncUnreadFromConversations = useInboxStore((state) => state.syncUnreadFromConversations);
  const markConversationRead = useInboxStore((state) => state.markConversationRead);
  const typingByConversation = useInboxStore((state) => state.typingByConversation);
  const aiSuggestionByConversation = useInboxStore((state) => state.aiSuggestionByConversation);
  const clearAiSuggestion = useInboxStore((state) => state.clearAiSuggestion);

  const filters = useMemo(
    () => ({
      page: 1,
      limit: 30,
      sort: "-lastMessageAt" as const,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(status ? { status } : {}),
      ...(channel ? { channel } : {}),
    }),
    [debouncedSearch, status, channel],
  );

  const orgQuery = useOrganization(organizationId ?? undefined);
  const conversationsQuery = useConversations(organizationId ?? undefined, filters);
  const conversationFallbackQuery = useConversation(organizationId ?? undefined, selectedConversationId ?? undefined);
  const teamQuery = useTeam(organizationId ?? undefined);

  const selectedConversation = useMemo(() => {
    const fromList = conversationsQuery.data?.data.find((item) => item.id === selectedConversationId);
    return fromList ?? conversationFallbackQuery.data;
  }, [conversationsQuery.data?.data, conversationFallbackQuery.data, selectedConversationId]);

  const messagesQuery = useMessages(organizationId ?? undefined, selectedConversationId ?? undefined, 50);
  const sendMessageMutation = useSendMessage(organizationId ?? undefined, selectedConversationId ?? undefined);
  const toggleAiMutation = useToggleConversationAi(organizationId ?? undefined, selectedConversationId ?? undefined);
  const assignConversationMutation = useAssignConversation(organizationId ?? undefined, selectedConversationId ?? undefined);

  const contactQuery = useContact(
    organizationId ?? undefined,
    selectedConversation?.contact.id ?? undefined,
  );

  const messages = useMemo(() => flattenMessagePages(messagesQuery.data?.pages), [messagesQuery.data?.pages]);

  const listItems = useMemo(
    () =>
      (conversationsQuery.data?.data ?? []).map((conversation) => ({
        id: conversation.id,
        name: conversation.contact.displayName,
        preview: conversation.lastMessagePreview ?? "No messages yet",
        unreadCount: conversation.unreadCount,
        channelType: conversation.channel.type,
        status: conversation.status,
        priority: conversation.priority,
        aiEnabled: conversation.aiEnabled,
        ...(conversation.lastMessageAt ? { lastMessageAt: conversation.lastMessageAt } : {}),
      })),
    [conversationsQuery.data?.data],
  );

  const typingUsers = selectedConversationId ? typingByConversation[selectedConversationId] ?? [] : [];
  const aiSuggestion = selectedConversationId ? aiSuggestionByConversation[selectedConversationId] : undefined;

  const assigneeOptions = useMemo(() => {
    const members = teamQuery.data ?? [];

    return members
      .filter((member) => member.role !== "VIEWER" && member.user.isActive)
      .map((member) => ({
        id: member.user.id,
        label: `${member.user.firstName} ${member.user.lastName}`,
      }));
  }, [teamQuery.data]);

  useEffect(() => {
    const conversations = conversationsQuery.data?.data;
    if (!conversations) {
      return;
    }

    syncUnreadFromConversations(
      conversations.map((conversation) => ({
        id: conversation.id,
        unreadCount: conversation.unreadCount,
      })),
    );

    if (!selectedConversationId && conversations.length > 0) {
      const firstConversationId = conversations[0]?.id;
      if (firstConversationId) {
        setSelectedConversationId(firstConversationId);
      }
    }
  }, [
    conversationsQuery.data?.data,
    selectedConversationId,
    setSelectedConversationId,
    syncUnreadFromConversations,
  ]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    markConversationRead(conversationId);
    if (isMobile) {
      setMobileView("chat");
    }
  };

  const sendContent = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || !selectedConversationId) {
      return;
    }

    await sendMessageMutation.mutateAsync({
      content: trimmed,
      contentType: "TEXT",
    });
  };

  const handleSend = async () => {
    await sendContent(draft);

    setDraft("");
  };

  const showList = !isMobile || mobileView === "list";
  const showChat = !isMobile || mobileView === "chat";

  const aiToggleDisabled = orgQuery.data?.aiMode === "OFF";
  const aiToggleDisabledReason = aiToggleDisabled ? "Enable AI in organization settings first" : undefined;

  return (
    <div className="space-y-4">
      <PageHeader title="Inbox" description="Real-time unified conversations across all channels." />

      <Card>
        <CardContent className="h-[calc(100vh-11rem)] min-h-[560px] p-0">
          <div className="flex h-full min-h-0 overflow-hidden rounded-md">
            {showList ? (
              <section
                className={cn(
                  "flex h-full min-h-0 w-full flex-col border-r lg:w-[20rem]",
                  isMobile && showChat ? "hidden" : "",
                )}
              >
                <ConversationFilters
                  search={search}
                  status={status}
                  channel={channel}
                  soundEnabled={soundEnabled}
                  browserNotificationsEnabled={browserNotificationsEnabled}
                  onSearchChange={setSearch}
                  onStatusChange={setStatus}
                  onChannelChange={setChannel}
                  onToggleSound={() => setSoundEnabled(!soundEnabled)}
                  onToggleBrowserNotifications={() => {
                    const nextEnabled = !browserNotificationsEnabled;
                    setBrowserNotificationsEnabled(nextEnabled);

                    if (
                      nextEnabled &&
                      typeof window !== "undefined" &&
                      "Notification" in window &&
                      Notification.permission === "default"
                    ) {
                      void Notification.requestPermission();
                    }
                  }}
                />

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {conversationsQuery.isLoading ? (
                    <div className="space-y-2 p-3">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <Skeleton key={index} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : null}

                  {conversationsQuery.isError ? (
                    <div className="p-3">
                      <EmptyState title="Unable to load conversations" description="Please refresh and try again." />
                    </div>
                  ) : null}

                  {!conversationsQuery.isLoading && !conversationsQuery.isError && listItems.length === 0 ? (
                    <div className="p-3">
                      <EmptyState
                        title="No conversations"
                        description="New messages will appear here."
                        illustrationSrc="/images/empty-states/no-conversations.svg"
                        illustrationAlt="No conversations illustration"
                      />
                    </div>
                  ) : null}

                  {!conversationsQuery.isLoading && !conversationsQuery.isError && listItems.length > 0 ? (
                    <ConversationList
                      items={listItems}
                      selectedId={selectedConversationId ?? undefined}
                      onSelect={handleSelectConversation}
                    />
                  ) : null}
                </div>
              </section>
            ) : null}

            {showChat ? (
              <section className={cn("flex min-h-0 flex-1", isMobile ? "w-full" : "")}> 
                <div className="min-h-0 flex-1 p-3">
                  {selectedConversation ? (
                    <ChatWindow
                      title={selectedConversation.contact.displayName}
                      subtitle={selectedConversation.status}
                      channelType={selectedConversation.channel.type}
                      aiEnabled={selectedConversation.aiEnabled}
                      aiToggleDisabled={aiToggleDisabled}
                      assignedToId={selectedConversation.assignedTo?.id ?? null}
                      assigneeOptions={assigneeOptions}
                      isAssigning={assignConversationMutation.isPending}
                      showBackButton={isMobile}
                      onBack={() => setMobileView("list")}
                      onAssign={(assigneeId) => {
                        void assignConversationMutation.mutateAsync({ assignedToId: assigneeId });
                      }}
                      messages={messages}
                      hasMoreMessages={messagesQuery.hasNextPage}
                      isLoadingMoreMessages={messagesQuery.isFetchingNextPage}
                      onLoadMoreMessages={() => {
                        if (messagesQuery.hasNextPage) {
                          void messagesQuery.fetchNextPage();
                        }
                      }}
                      inputValue={draft}
                      isSending={sendMessageMutation.isPending}
                      isTyping={typingUsers.length > 0}
                      isAiProcessing={selectedConversation.isAiHandling}
                      typingUsersCount={typingUsers.length}
                      {...(aiSuggestion ? { aiSuggestion } : {})}
                      onInputChange={setDraft}
                      onSend={() => {
                        void handleSend();
                      }}
                      onSendSuggestion={() => {
                        if (!aiSuggestion) {
                          return;
                        }

                        clearAiSuggestion(selectedConversation.id);
                        void sendContent(aiSuggestion);
                      }}
                      onEditSuggestion={() => {
                        if (!aiSuggestion) {
                          return;
                        }

                        setDraft(aiSuggestion);
                        clearAiSuggestion(selectedConversation.id);
                      }}
                      onDismissSuggestion={() => {
                        clearAiSuggestion(selectedConversation.id);
                      }}
                      onToggleAi={(enabled) => {
                        void toggleAiMutation.mutateAsync({ aiEnabled: enabled });
                      }}
                      {...(aiToggleDisabledReason ? { aiToggleDisabledReason } : {})}
                    />
                  ) : (
                    <EmptyInbox onAction={() => router.push("/channels")} />
                  )}
                </div>

                {!isMobile ? (
                  <div className="hidden w-[18rem] lg:block">
                    {selectedConversation ? (
                      <ContactPanel
                        name={selectedConversation.contact.displayName}
                        avatar={selectedConversation.contact.avatar}
                        stage={contactQuery.data?.stage ?? selectedConversation.contact.stage}
                        score={contactQuery.data?.leadScore}
                        email={contactQuery.data?.email ?? selectedConversation.contact.email}
                        phone={contactQuery.data?.phone ?? selectedConversation.contact.phone}
                        company={contactQuery.data?.company}
                        jobTitle={contactQuery.data?.jobTitle}
                        notes={contactQuery.data?.notes}
                        tags={contactQuery.data?.tags}
                        conversationCount={contactQuery.data?.conversationCount}
                      />
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
