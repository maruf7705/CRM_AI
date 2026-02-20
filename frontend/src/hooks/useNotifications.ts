"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useNotificationStore } from "@/stores/notificationStore";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  success: boolean;
  data: NotificationItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const useNotifications = (page = 1, limit = 20) => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  return useQuery({
    queryKey: ["notifications", page, limit],
    queryFn: async () => {
      const response = await api.get<NotificationListResponse>("/notifications", {
        params: { page, limit },
      });

      response.data.data.forEach((notification) => {
        addNotification({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        });
      });

      return {
        data: response.data.data,
        meta: response.data.meta,
      };
    },
    staleTime: 15_000,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  const markRead = useNotificationStore((state) => state.markRead);

  return useMutation({
    mutationFn: async (notificationId: string): Promise<NotificationItem> => {
      const response = await api.patch<ApiResponse<NotificationItem>>(`/notifications/${notificationId}/read`);
      return response.data.data;
    },
    onSuccess: async (notification) => {
      markRead(notification.id);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const markAllRead = useNotificationStore((state) => state.markAllRead);

  return useMutation({
    mutationFn: async (): Promise<{ updatedCount: number }> => {
      const response = await api.post<ApiResponse<{ updatedCount: number }>>("/notifications/read-all");
      return response.data.data;
    },
    onSuccess: async () => {
      markAllRead();
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
