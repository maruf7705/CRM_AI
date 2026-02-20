"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AiSettings {
  aiEnabled: boolean;
  aiMode: "OFF" | "SUGGESTION" | "AUTO_REPLY";
  aiSystemPrompt: string;
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  n8nWebhookUrl?: string;
}

export interface UpdateAiSettingsInput {
  aiMode?: "OFF" | "SUGGESTION" | "AUTO_REPLY";
  aiSystemPrompt?: string | null;
  aiModel?: string;
  aiTemperature?: number;
  aiMaxTokens?: number;
  n8nWebhookUrl?: string | null;
}

export interface AiTrainingDoc {
  id: string;
  title: string;
  content: string;
  fileUrl?: string;
  fileType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingDocInput {
  title?: string;
  content?: string;
  file?: File;
}

export interface AiTestInput {
  message: string;
  conversationId?: string;
}

export interface AiTestResult {
  response: string;
  model: string;
  tokensUsed?: number;
  confidence?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const invalidateAiQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["ai-settings", organizationId] }),
    queryClient.invalidateQueries({ queryKey: ["ai-training", organizationId] }),
  ]);
};

export const useAiSettings = (organizationId?: string) => {
  return useQuery({
    queryKey: ["ai-settings", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<AiSettings> => {
      const response = await api.get<ApiResponse<AiSettings>>(`/orgs/${organizationId}/ai/settings`);
      return response.data.data;
    },
    staleTime: 30_000,
  });
};

export const useUpdateAiSettings = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAiSettingsInput): Promise<AiSettings> => {
      const response = await api.patch<ApiResponse<AiSettings>>(`/orgs/${organizationId}/ai/settings`, payload);
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateAiQueries(queryClient, organizationId);
      }
    },
  });
};

export const useTrainingDocs = (organizationId?: string) => {
  return useQuery({
    queryKey: ["ai-training", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<AiTrainingDoc[]> => {
      const response = await api.get<ApiResponse<AiTrainingDoc[]>>(`/orgs/${organizationId}/ai/training`);
      return response.data.data;
    },
    staleTime: 20_000,
  });
};

export const useCreateTrainingDoc = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTrainingDocInput): Promise<AiTrainingDoc> => {
      const formData = new FormData();

      if (payload.title) {
        formData.append("title", payload.title);
      }

      if (payload.content) {
        formData.append("content", payload.content);
      }

      if (payload.file) {
        formData.append("file", payload.file);
      }

      const response = await api.post<ApiResponse<AiTrainingDoc>>(
        `/orgs/${organizationId}/ai/training`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateAiQueries(queryClient, organizationId);
      }
    },
  });
};

export const useDeleteTrainingDoc = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (docId: string): Promise<void> => {
      await api.delete(`/orgs/${organizationId}/ai/training/${docId}`);
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateAiQueries(queryClient, organizationId);
      }
    },
  });
};

export const useTestAi = (organizationId?: string) => {
  return useMutation({
    mutationFn: async (payload: AiTestInput): Promise<AiTestResult> => {
      const response = await api.post<ApiResponse<AiTestResult>>(`/orgs/${organizationId}/ai/test`, payload);
      return response.data.data;
    },
  });
};
