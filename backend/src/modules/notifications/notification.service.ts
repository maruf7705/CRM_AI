import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../utils/errors";
import { toOffsetPagination } from "../../utils/pagination";
import type { ListNotificationsQuery } from "./notification.validators";

interface NotificationResponse {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
}

interface NotificationListResult {
  data: NotificationResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

const toNotificationResponse = (notification: {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: Prisma.JsonValue;
  createdAt: Date;
}): NotificationResponse => {
  const payload: NotificationResponse = {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };

  if (notification.data && typeof notification.data === "object") {
    payload.data = notification.data as Record<string, unknown>;
  }

  return payload;
};

export class NotificationService {
  async listNotifications(userId: string, query: ListNotificationsQuery): Promise<NotificationListResult> {
    const pagination = toOffsetPagination(query, { page: 1, limit: 20 });

    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: [{ createdAt: "desc" }],
      }),
    ]);

    return {
      data: notifications.map(toNotificationResponse),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
        unreadCount,
      },
    };
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationResponse> {
    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Notification");
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
      },
    });

    return toNotificationResponse(updated);
  }

  async markAllRead(userId: string): Promise<{ updatedCount: number }> {
    const updated = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      updatedCount: updated.count,
    };
  }
}

export const notificationService = new NotificationService();

