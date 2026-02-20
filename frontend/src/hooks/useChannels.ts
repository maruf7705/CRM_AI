"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Channel, ChannelDetail, ChannelType } from "@/types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ChannelPayload {
  type: ChannelType;
  name: string;
  externalId?: string | null;
  webhookSecret?: string | null;
  metadata?: Record<string, unknown> | null;
  credentials: Record<string, unknown>;
  isActive?: boolean;
}

interface UpdateChannelPayload {
  name?: string;
  externalId?: string | null;
  webhookSecret?: string | null;
  metadata?: Record<string, unknown> | null;
  credentials?: Record<string, unknown>;
  isActive?: boolean;
  lastSyncAt?: string | null;
}

interface ChannelTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export type OauthChannelType = "FACEBOOK" | "INSTAGRAM";

interface ConnectUrlPayload {
  redirectUri: string;
  state?: string;
}

interface ConnectUrlResult {
  type: OauthChannelType;
  authUrl: string;
  state: string;
}

interface CompleteConnectPayload {
  code: string;
  redirectUri: string;
  state?: string;
  channelName?: string;
  externalId?: string;
}

interface CompleteConnectResult {
  channel: Channel;
  isNew: boolean;
}

const invalidateChannels = async (queryClient: ReturnType<typeof useQueryClient>, organizationId: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["channels", organizationId] }),
    queryClient.invalidateQueries({ queryKey: ["channel", organizationId] }),
  ]);
};

export const useChannels = (organizationId?: string) => {
  return useQuery({
    queryKey: ["channels", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Channel[]> => {
      const response = await api.get<ApiResponse<Channel[]>>(`/orgs/${organizationId}/channels`);
      return response.data.data;
    },
    staleTime: 30_000,
  });
};

export const useChannel = (organizationId?: string, channelId?: string) => {
  return useQuery({
    queryKey: ["channel", organizationId, channelId],
    enabled: Boolean(organizationId) && Boolean(channelId),
    queryFn: async (): Promise<ChannelDetail> => {
      const response = await api.get<ApiResponse<ChannelDetail>>(`/orgs/${organizationId}/channels/${channelId}`);
      return response.data.data;
    },
    staleTime: 30_000,
  });
};

export const useCreateChannel = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ChannelPayload): Promise<Channel> => {
      const response = await api.post<ApiResponse<Channel>>(`/orgs/${organizationId}/channels`, payload);
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateChannels(queryClient, organizationId);
      }
    },
  });
};

export const useUpdateChannel = (organizationId?: string, channelId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateChannelPayload): Promise<Channel> => {
      const response = await api.patch<ApiResponse<Channel>>(`/orgs/${organizationId}/channels/${channelId}`, payload);
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateChannels(queryClient, organizationId);
      }
    },
  });
};

export const useDeleteChannel = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string): Promise<void> => {
      await api.delete(`/orgs/${organizationId}/channels/${channelId}`);
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateChannels(queryClient, organizationId);
      }
    },
  });
};

export const useTestChannelConnection = (organizationId?: string) => {
  return useMutation({
    mutationFn: async (channelId: string): Promise<ChannelTestResult> => {
      const response = await api.post<ApiResponse<ChannelTestResult>>(
        `/orgs/${organizationId}/channels/${channelId}/test`,
      );
      return response.data.data;
    },
  });
};

export const useChannelConnectUrl = (organizationId?: string, type?: OauthChannelType) => {
  return useMutation({
    mutationFn: async (payload: ConnectUrlPayload): Promise<ConnectUrlResult> => {
      const response = await api.get<ApiResponse<ConnectUrlResult>>(
        `/orgs/${organizationId}/channels/connect/${type}/url`,
        {
          params: payload,
        },
      );

      return response.data.data;
    },
  });
};

export const useCompleteChannelConnect = (organizationId?: string, type?: OauthChannelType) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CompleteConnectPayload): Promise<CompleteConnectResult> => {
      const response = await api.post<ApiResponse<CompleteConnectResult>>(
        `/orgs/${organizationId}/channels/connect/${type}/callback`,
        payload,
      );

      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateChannels(queryClient, organizationId);
      }
    },
  });
};
