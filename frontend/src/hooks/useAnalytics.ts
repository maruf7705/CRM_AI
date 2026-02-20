"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AnalyticsAgents, AnalyticsAi, AnalyticsChannels, AnalyticsOverview } from "@/types";

export interface AnalyticsRangeInput {
  from?: string;
  to?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const buildRangeParams = (range?: AnalyticsRangeInput): Record<string, string> | undefined => {
  if (!range?.from && !range?.to) {
    return undefined;
  }

  const params: Record<string, string> = {};

  if (range.from) {
    params.from = range.from;
  }

  if (range.to) {
    params.to = range.to;
  }

  return params;
};

export const useAnalyticsOverview = (organizationId?: string, range?: AnalyticsRangeInput) => {
  return useQuery({
    queryKey: ["analytics", "overview", organizationId, range?.from, range?.to],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await api.get<ApiResponse<AnalyticsOverview>>(
        `/orgs/${organizationId}/analytics/overview`,
        {
          params: buildRangeParams(range),
        },
      );
      return response.data.data;
    },
    staleTime: 60_000,
  });
};

export const useAnalyticsChannels = (organizationId?: string, range?: AnalyticsRangeInput) => {
  return useQuery({
    queryKey: ["analytics", "channels", organizationId, range?.from, range?.to],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await api.get<ApiResponse<AnalyticsChannels>>(
        `/orgs/${organizationId}/analytics/channels`,
        {
          params: buildRangeParams(range),
        },
      );
      return response.data.data;
    },
    staleTime: 60_000,
  });
};

export const useAnalyticsAi = (organizationId?: string, range?: AnalyticsRangeInput) => {
  return useQuery({
    queryKey: ["analytics", "ai", organizationId, range?.from, range?.to],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await api.get<ApiResponse<AnalyticsAi>>(`/orgs/${organizationId}/analytics/ai`, {
        params: buildRangeParams(range),
      });
      return response.data.data;
    },
    staleTime: 60_000,
  });
};

export const useAnalyticsAgents = (organizationId?: string, range?: AnalyticsRangeInput) => {
  return useQuery({
    queryKey: ["analytics", "agents", organizationId, range?.from, range?.to],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await api.get<ApiResponse<AnalyticsAgents>>(`/orgs/${organizationId}/analytics/agents`, {
        params: buildRangeParams(range),
      });
      return response.data.data;
    },
    staleTime: 60_000,
  });
};

export const useAnalytics = useAnalyticsOverview;
