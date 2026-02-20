import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { notificationService } from "./notification.service";
import type { ListNotificationsQuery } from "./notification.validators";

const requireActorId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
};

const requireNotificationId = (req: Request): string => {
  const notificationId = req.params.id;
  if (!notificationId) {
    throw new BadRequestError("Notification id is required");
  }

  return notificationId;
};

export class NotificationController {
  listNotifications = async (req: Request, res: Response): Promise<void> => {
    const payload = await notificationService.listNotifications(
      requireActorId(req),
      req.query as ListNotificationsQuery,
    );

    res.status(200).json({
      success: true,
      data: payload.data,
      meta: payload.meta,
    });
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.markRead(requireActorId(req), requireNotificationId(req));
    res.status(200).json({ success: true, data });
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    const data = await notificationService.markAllRead(requireActorId(req));
    res.status(200).json({ success: true, data });
  };
}

export const notificationController = new NotificationController();

