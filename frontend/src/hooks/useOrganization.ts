"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Plan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type AiMode = "OFF" | "SUGGESTION" | "AUTO_REPLY";

export interface OrganizationSettings {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: Plan;
  maxAgents: number;
  maxChannels: number;
  aiEnabled: boolean;
  aiMode: AiMode;
  aiSystemPrompt?: string;
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  n8nWebhookUrl?: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  currentUserRole: "OWNER" | "ADMIN" | "AGENT" | "VIEWER";
}

interface OrgResponse {
  success: boolean;
  data: OrganizationSettings;
}

export interface UpdateOrganizationInput {
  name?: string;
  logo?: string | null;
  plan?: Plan;
  maxAgents?: number;
  maxChannels?: number;
  aiEnabled?: boolean;
  aiMode?: AiMode;
  aiSystemPrompt?: string | null;
  aiModel?: string;
  aiTemperature?: number;
  aiMaxTokens?: number;
  n8nWebhookUrl?: string | null;
}

export const useOrganization = (organizationId?: string) => {
  return useQuery({
    queryKey: ["organization", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await api.get<OrgResponse>(`/orgs/${organizationId}`);
      return response.data.data;
    },
    staleTime: 30_000,
  });
};

export const useUpdateOrganization = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateOrganizationInput) => {
      if (!organizationId) {
        throw new Error("Organization is required");
      }

      const response = await api.patch<OrgResponse>(`/orgs/${organizationId}`, payload);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["organization", organizationId], data);
    },
  });
};
