import { Router, type NextFunction, type Request, type Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { notificationController } from "./notification.controller";
import { listNotificationsQuerySchema, notificationParamsSchema } from "./notification.validators";

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

export const notificationRouter = Router();

notificationRouter.use(authMiddleware);

notificationRouter.get(
  "/",
  validatorMiddleware({ query: listNotificationsQuerySchema }),
  asyncHandler(notificationController.listNotifications),
);
notificationRouter.patch(
  "/:id/read",
  validatorMiddleware({ params: notificationParamsSchema }),
  asyncHandler(notificationController.markRead),
);
notificationRouter.post("/read-all", asyncHandler(notificationController.markAllRead));
