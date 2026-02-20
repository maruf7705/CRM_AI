"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ContentType, Message } from "@/types";

interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface SendMessagePayload {
  content: string;
  contentType?: ContentType;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface TriggerAiReplyPayload {
  force?: boolean;
}

const invalidateMessages = async (
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  conversationId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["messages", organizationId, conversationId] }),
    queryClient.invalidateQueries({ queryKey: ["conversations", organizationId] }),
    queryClient.invalidateQueries({ queryKey: ["conversation", organizationId, conversationId] }),
  ]);
};

export const useMessages = (organizationId?: string, conversationId?: string, limit = 50) => {
  return useInfiniteQuery({
    queryKey: ["messages", organizationId, conversationId, limit],
    enabled: Boolean(organizationId) && Boolean(conversationId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<ApiListResponse<Message>> => {
      const response = await api.get<ApiListResponse<Message>>(
        `/orgs/${organizationId}/conversations/${conversationId}/messages`,
        {
          params: {
            limit,
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        },
      );

      return response.data;
    },
    getNextPageParam: (lastPage) => (lastPage.meta.hasMore ? lastPage.meta.nextCursor : undefined),
    staleTime: 10_000,
  });
};

export const useSendMessage = (organizationId?: string, conversationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendMessagePayload): Promise<Message> => {
      const response = await api.post<ApiResponse<Message>>(
        `/orgs/${organizationId}/conversations/${conversationId}/messages`,
        {
          content: payload.content,
          contentType: payload.contentType ?? "TEXT",
          mediaUrl: payload.mediaUrl,
          mediaMimeType: payload.mediaMimeType,
          metadata: payload.metadata,
        },
      );
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId && conversationId) {
        await invalidateMessages(queryClient, organizationId, conversationId);
      }
    },
  });
};

export const useTriggerAiReply = (organizationId?: string, conversationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload?: TriggerAiReplyPayload): Promise<{ queued: boolean; message: string }> => {
      const response = await api.post<ApiResponse<{ queued: boolean; message: string }>>(
        `/orgs/${organizationId}/conversations/${conversationId}/messages/ai-reply`,
        {
          force: payload?.force,
        },
      );
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId && conversationId) {
        await invalidateMessages(queryClient, organizationId, conversationId);
      }
    },
  });
};

export const flattenMessagePages = (pages: Array<ApiListResponse<Message>> | undefined): Message[] => {
  if (!pages) {
    return [];
  }

  return pages.flatMap((page) => page.data);
};
