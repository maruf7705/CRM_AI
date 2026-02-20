"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type MemberRole = "OWNER" | "ADMIN" | "AGENT" | "VIEWER";

export interface TeamMember {
  id: string;
  role: MemberRole;
  isOnline: boolean;
  maxConcurrent: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    emailVerified: boolean;
    isActive: boolean;
  };
}

interface TeamResponse {
  success: boolean;
  data: TeamMember[];
}

interface InviteMemberInput {
  email: string;
  firstName?: string;
  lastName?: string;
  role: MemberRole;
}

interface UpdateMemberInput {
  role?: MemberRole;
  isOnline?: boolean;
  maxConcurrent?: number;
}

interface MemberResponse {
  success: boolean;
  data: TeamMember;
}

export const useTeam = (organizationId?: string) => {
  return useQuery({
    queryKey: ["team", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await api.get<TeamResponse>(`/orgs/${organizationId}/members`);
      return response.data.data;
    },
    staleTime: 15_000,
  });
};

export const useInviteMember = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InviteMemberInput) => {
      if (!organizationId) {
        throw new Error("Organization is required");
      }

      const response = await api.post<MemberResponse>(`/orgs/${organizationId}/members/invite`, payload);
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["team", organizationId] });
    },
  });
};

export const useUpdateMember = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, payload }: { memberId: string; payload: UpdateMemberInput }) => {
      if (!organizationId) {
        throw new Error("Organization is required");
      }

      const response = await api.patch<MemberResponse>(`/orgs/${organizationId}/members/${memberId}`, payload);
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["team", organizationId] });
    },
  });
};

export const useRemoveMember = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!organizationId) {
        throw new Error("Organization is required");
      }

      await api.delete(`/orgs/${organizationId}/members/${memberId}`);
      return memberId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["team", organizationId] });
    },
  });
};
