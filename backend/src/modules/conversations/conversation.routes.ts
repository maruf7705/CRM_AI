import { Router, type NextFunction, type Request, type Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { rbacMiddleware } from "../../middleware/rbac.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { conversationController } from "./conversation.controller";
import {
  assignConversationSchema,
  conversationParamsSchema,
  listConversationsQuerySchema,
  orgIdParamsSchema,
  updateConversationAiSchema,
  updateConversationSchema,
} from "./conversation.validators";

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

export const conversationRouter = Router();

conversationRouter.use(authMiddleware);

conversationRouter.get(
  "/:orgId/conversations",
  validatorMiddleware({ params: orgIdParamsSchema, query: listConversationsQuerySchema }),
  asyncHandler(conversationController.listConversations),
);
conversationRouter.get(
  "/:orgId/conversations/:id",
  validatorMiddleware({ params: conversationParamsSchema }),
  asyncHandler(conversationController.getConversation),
);
conversationRouter.patch(
  "/:orgId/conversations/:id",
  validatorMiddleware({ params: conversationParamsSchema, body: updateConversationSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(conversationController.updateConversation),
);
conversationRouter.post(
  "/:orgId/conversations/:id/close",
  validatorMiddleware({ params: conversationParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(conversationController.closeConversation),
);
conversationRouter.post(
  "/:orgId/conversations/:id/reopen",
  validatorMiddleware({ params: conversationParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(conversationController.reopenConversation),
);
conversationRouter.post(
  "/:orgId/conversations/:id/assign",
  validatorMiddleware({ params: conversationParamsSchema, body: assignConversationSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(conversationController.assignConversation),
);
conversationRouter.patch(
  "/:orgId/conversations/:id/ai",
  validatorMiddleware({ params: conversationParamsSchema, body: updateConversationAiSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(conversationController.updateConversationAi),
);
