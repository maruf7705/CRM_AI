"use client";

import { create } from "zustand";

interface ConversationUnread {
  id: string;
  unreadCount: number;
}

interface InboxState {
  selectedConversationId: string | null;
  unreadCount: number;
  unreadByConversation: Record<string, number>;
  typingByConversation: Record<string, string[]>;
  aiSuggestionByConversation: Record<string, string>;
  setSelectedConversationId: (id: string | null) => void;
  setUnreadCount: (count: number) => void;
  syncUnreadFromConversations: (conversations: ConversationUnread[]) => void;
  applyUnreadUpdate: (conversationId: string, count: number) => void;
  markConversationRead: (conversationId: string) => void;
  setTyping: (conversationId: string, userId: string, typing: boolean) => void;
  clearTypingConversation: (conversationId: string) => void;
  setAiSuggestion: (conversationId: string, suggestion: string) => void;
  clearAiSuggestion: (conversationId: string) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  selectedConversationId: null,
  unreadCount: 0,
  unreadByConversation: {},
  typingByConversation: {},
  aiSuggestionByConversation: {},
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  syncUnreadFromConversations: (conversations) =>
    set(() => {
      const unreadByConversation: Record<string, number> = {};
      let totalUnread = 0;

      conversations.forEach((conversation) => {
        const normalizedCount = Math.max(0, conversation.unreadCount);
        unreadByConversation[conversation.id] = normalizedCount;
        totalUnread += normalizedCount;
      });

      return {
        unreadByConversation,
        unreadCount: totalUnread,
      };
    }),
  applyUnreadUpdate: (conversationId, count) =>
    set((state) => {
      const normalizedCount = Math.max(0, count);
      const previous = state.unreadByConversation[conversationId] ?? 0;
      const nextMap = {
        ...state.unreadByConversation,
        [conversationId]: normalizedCount,
      };

      return {
        unreadByConversation: nextMap,
        unreadCount: Math.max(0, state.unreadCount - previous + normalizedCount),
      };
    }),
  markConversationRead: (conversationId) =>
    set((state) => {
      const previous = state.unreadByConversation[conversationId] ?? 0;
      if (previous <= 0) {
        return state;
      }

      return {
        unreadByConversation: {
          ...state.unreadByConversation,
          [conversationId]: 0,
        },
        unreadCount: Math.max(0, state.unreadCount - previous),
      };
    }),
  setTyping: (conversationId, userId, typing) =>
    set((state) => {
      const currentUsers = state.typingByConversation[conversationId] ?? [];
      const nextUsers = typing
        ? Array.from(new Set([...currentUsers, userId]))
        : currentUsers.filter((id) => id !== userId);

      const nextTypingMap = {
        ...state.typingByConversation,
        [conversationId]: nextUsers,
      };

      if (nextUsers.length === 0) {
        delete nextTypingMap[conversationId];
      }

      return {
        typingByConversation: nextTypingMap,
      };
    }),
  clearTypingConversation: (conversationId) =>
    set((state) => {
      if (!state.typingByConversation[conversationId]) {
        return state;
      }

      const nextTyping = { ...state.typingByConversation };
      delete nextTyping[conversationId];

      return {
        typingByConversation: nextTyping,
      };
    }),
  setAiSuggestion: (conversationId, suggestion) =>
    set((state) => ({
      aiSuggestionByConversation: {
        ...state.aiSuggestionByConversation,
        [conversationId]: suggestion,
      },
    })),
  clearAiSuggestion: (conversationId) =>
    set((state) => {
      if (!state.aiSuggestionByConversation[conversationId]) {
        return state;
      }

      const nextSuggestions = { ...state.aiSuggestionByConversation };
      delete nextSuggestions[conversationId];

      return {
        aiSuggestionByConversation: nextSuggestions,
      };
    }),
}));
