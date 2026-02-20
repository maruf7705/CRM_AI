"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Conversation, ConversationStatus, Priority } from "@/types";

interface ListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: ListMeta;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ConversationFilters {
  status?: ConversationStatus;
  channel?: "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "WEBCHAT" | "TELEGRAM" | "EMAIL";
  search?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
  sort?: "lastMessageAt" | "-lastMessageAt" | "createdAt" | "-createdAt" | "updatedAt" | "-updatedAt" | "priority" | "-priority";
}

export interface UpdateConversationPayload {
  status?: ConversationStatus;
  priority?: Priority;
  subject?: string | null;
  assignedToId?: string | null;
  aiEnabled?: boolean;
  metadata?: Record<string, unknown> | null;
}

interface AssignConversationPayload {
  assignedToId: string | null;
}

interface ToggleConversationAiPayload {
  aiEnabled: boolean;
}

interface ConversationsResult {
  data: Conversation[];
  meta: ListMeta;
}

const invalidateConversations = async (
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["conversations", organizationId] }),
    queryClient.invalidateQueries({ queryKey: ["conversation", organizationId] }),
  ]);
};

export const useConversations = (organizationId?: string, filters?: ConversationFilters) => {
  return useQuery({
    queryKey: ["conversations", organizationId, filters],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<ConversationsResult> => {
      const response = await api.get<ApiListResponse<Conversation>>(`/orgs/${organizationId}/conversations`, {
        params: filters,
      });

      return {
        data: response.data.data,
        meta: response.data.meta,
      };
    },
    staleTime: 10_000,
  });
};

export const useConversation = (organizationId?: string, conversationId?: string) => {
  return useQuery({
    queryKey: ["conversation", organizationId, conversationId],
    enabled: Boolean(organizationId) && Boolean(conversationId),
    queryFn: async (): Promise<Conversation> => {
      const response = await api.get<ApiResponse<Conversation>>(
        `/orgs/${organizationId}/conversations/${conversationId}`,
      );
      return response.data.data;
    },
    staleTime: 10_000,
  });
};

export const useUpdateConversation = (organizationId?: string, conversationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateConversationPayload): Promise<Conversation> => {
      const response = await api.patch<ApiResponse<Conversation>>(
        `/orgs/${organizationId}/conversations/${conversationId}`,
        payload,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateConversations(queryClient, organizationId);
      }
    },
  });
};

export const useCloseConversation = (organizationId?: string, conversationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<Conversation> => {
      const response = await api.post<ApiResponse<Conversation>>(
        `/orgs/${organizationId}/conversations/${conversationId}/close`,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateConversations(queryClient, organizationId);
      }
    },
  });
};

export const useReopenConversation = (organizationId?: string, conversationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<Conversation> => {
      const response = await api.post<ApiResponse<Conversation>>(
        `/orgs/${organizationId}/conversations/${conversationId}/reopen`,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateConversations(queryClient, organizationId);
      }
    },
  });
};

export const useAssignConversation = (organizationId?: string, conversationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AssignConversationPayload): Promise<Conversation> => {
      const response = await api.post<ApiResponse<Conversation>>(
        `/orgs/${organizationId}/conversations/${conversationId}/assign`,
        payload,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateConversations(queryClient, organizationId);
      }
    },
  });
};

export const useToggleConversationAi = (organizationId?: string, conversationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ToggleConversationAiPayload): Promise<Conversation> => {
      const response = await api.patch<ApiResponse<Conversation>>(
        `/orgs/${organizationId}/conversations/${conversationId}/ai`,
        payload,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateConversations(queryClient, organizationId);
      }
    },
  });
};
