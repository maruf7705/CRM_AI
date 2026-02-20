import { Router, type NextFunction, type Request, type Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { aiRateLimiter } from "../../middleware/rateLimiter.middleware";
import { rbacMiddleware } from "../../middleware/rbac.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { messageController } from "./message.controller";
import {
  aiReplySchema,
  listMessagesQuerySchema,
  messageParamsSchema,
  sendMessageSchema,
} from "./message.validators";

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

export const messageRouter = Router();

messageRouter.use(authMiddleware);

messageRouter.get(
  "/:orgId/conversations/:convId/messages",
  validatorMiddleware({ params: messageParamsSchema, query: listMessagesQuerySchema }),
  asyncHandler(messageController.listMessages),
);
messageRouter.post(
  "/:orgId/conversations/:convId/messages",
  validatorMiddleware({ params: messageParamsSchema, body: sendMessageSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(messageController.sendMessage),
);
messageRouter.post(
  "/:orgId/conversations/:convId/messages/ai-reply",
  aiRateLimiter,
  validatorMiddleware({ params: messageParamsSchema, body: aiReplySchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(messageController.triggerAiReply),
);
