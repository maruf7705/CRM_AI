"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Contact, ContactConversation, ContactStage, ContactTag } from "@/types";

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

export interface ContactFilters {
  search?: string;
  stage?: ContactStage;
  tagId?: string;
  page?: number;
  limit?: number;
  sort?:
    | "createdAt"
    | "-createdAt"
    | "updatedAt"
    | "-updatedAt"
    | "leadScore"
    | "-leadScore"
    | "displayName"
    | "-displayName"
    | "lastSeenAt"
    | "-lastSeenAt";
}

export interface ContactPayload {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  facebookId?: string | null;
  instagramId?: string | null;
  whatsappId?: string | null;
  telegramId?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  notes?: string | null;
  leadScore?: number;
  stage?: ContactStage;
  customFields?: Record<string, unknown> | null;
  lastSeenAt?: string | null;
}

interface ContactConversationsQuery {
  page?: number;
  limit?: number;
}

interface TagResponse {
  id: string;
  name: string;
  color: string;
  contactCount: number;
}

interface AddTagPayload {
  contactId: string;
  tagIds: string[];
}

interface RemoveTagPayload {
  contactId: string;
  tagId: string;
}

interface ContactConversationsResult {
  data: ContactConversation[];
  meta: ListMeta;
}

const invalidateContacts = async (queryClient: ReturnType<typeof useQueryClient>, orgId: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["contacts", orgId] }),
    queryClient.invalidateQueries({ queryKey: ["contact", orgId] }),
    queryClient.invalidateQueries({ queryKey: ["contact-conversations", orgId] }),
    queryClient.invalidateQueries({ queryKey: ["tags", orgId] }),
  ]);
};

export const useContacts = (organizationId?: string, filters?: ContactFilters) => {
  return useQuery({
    queryKey: ["contacts", organizationId, filters],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<{ data: Contact[]; meta: ListMeta }> => {
      const response = await api.get<ApiListResponse<Contact>>(`/orgs/${organizationId}/contacts`, {
        params: filters,
      });

      return {
        data: response.data.data,
        meta: response.data.meta,
      };
    },
    staleTime: 20_000,
  });
};

export const useContact = (organizationId?: string, contactId?: string) => {
  return useQuery({
    queryKey: ["contact", organizationId, contactId],
    enabled: Boolean(organizationId) && Boolean(contactId),
    queryFn: async (): Promise<Contact> => {
      const response = await api.get<ApiResponse<Contact>>(`/orgs/${organizationId}/contacts/${contactId}`);
      return response.data.data;
    },
    staleTime: 15_000,
  });
};

export const useCreateContact = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ContactPayload): Promise<Contact> => {
      const response = await api.post<ApiResponse<Contact>>(`/orgs/${organizationId}/contacts`, payload);
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateContacts(queryClient, organizationId);
      }
    },
  });
};

export const useUpdateContact = (organizationId?: string, contactId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ContactPayload): Promise<Contact> => {
      const response = await api.patch<ApiResponse<Contact>>(
        `/orgs/${organizationId}/contacts/${contactId}`,
        payload,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateContacts(queryClient, organizationId);
      }
    },
  });
};

export const useDeleteContact = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string): Promise<void> => {
      await api.delete(`/orgs/${organizationId}/contacts/${contactId}`);
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateContacts(queryClient, organizationId);
      }
    },
  });
};

export const useContactConversations = (
  organizationId?: string,
  contactId?: string,
  query?: ContactConversationsQuery,
) => {
  return useQuery({
    queryKey: ["contact-conversations", organizationId, contactId, query],
    enabled: Boolean(organizationId) && Boolean(contactId),
    queryFn: async (): Promise<ContactConversationsResult> => {
      const response = await api.get<ApiListResponse<ContactConversation>>(
        `/orgs/${organizationId}/contacts/${contactId}/conversations`,
        {
          params: query,
        },
      );

      return {
        data: response.data.data,
        meta: response.data.meta,
      };
    },
    staleTime: 15_000,
  });
};

export const useTags = (organizationId?: string) => {
  return useQuery({
    queryKey: ["tags", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<TagResponse[]> => {
      const response = await api.get<ApiResponse<TagResponse[]>>(`/orgs/${organizationId}/tags`);
      return response.data.data;
    },
    staleTime: 30_000,
  });
};

export const useAddContactTags = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddTagPayload): Promise<Contact> => {
      const response = await api.post<ApiResponse<Contact>>(
        `/orgs/${organizationId}/contacts/${payload.contactId}/tags`,
        {
          tagIds: payload.tagIds,
        },
      );
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateContacts(queryClient, organizationId);
      }
    },
  });
};

export const useRemoveContactTag = (organizationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RemoveTagPayload): Promise<Contact> => {
      const response = await api.delete<ApiResponse<Contact>>(
        `/orgs/${organizationId}/contacts/${payload.contactId}/tags/${payload.tagId}`,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      if (organizationId) {
        await invalidateContacts(queryClient, organizationId);
      }
    },
  });
};

export type { ContactTag };
