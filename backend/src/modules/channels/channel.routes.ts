import { Router, type NextFunction, type Request, type Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { rbacMiddleware } from "../../middleware/rbac.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { channelController } from "./channel.controller";
import {
  channelParamsSchema,
  oauthConnectCallbackSchema,
  oauthConnectParamsSchema,
  oauthConnectUrlQuerySchema,
  createChannelSchema,
  orgIdParamsSchema,
  updateChannelSchema,
} from "./channel.validators";

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

export const channelRouter = Router();

channelRouter.use(authMiddleware);

channelRouter.get(
  "/:orgId/channels",
  validatorMiddleware({ params: orgIdParamsSchema }),
  asyncHandler(channelController.listChannels),
);
channelRouter.post(
  "/:orgId/channels",
  validatorMiddleware({ params: orgIdParamsSchema, body: createChannelSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(channelController.createChannel),
);
channelRouter.get(
  "/:orgId/channels/connect/:type/url",
  validatorMiddleware({ params: oauthConnectParamsSchema, query: oauthConnectUrlQuerySchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(channelController.buildOauthConnectUrl),
);
channelRouter.post(
  "/:orgId/channels/connect/:type/callback",
  validatorMiddleware({ params: oauthConnectParamsSchema, body: oauthConnectCallbackSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(channelController.completeOauthConnect),
);
channelRouter.get(
  "/:orgId/channels/:id",
  validatorMiddleware({ params: channelParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(channelController.getChannel),
);
channelRouter.patch(
  "/:orgId/channels/:id",
  validatorMiddleware({ params: channelParamsSchema, body: updateChannelSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(channelController.updateChannel),
);
channelRouter.delete(
  "/:orgId/channels/:id",
  validatorMiddleware({ params: channelParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(channelController.disconnectChannel),
);
channelRouter.post(
  "/:orgId/channels/:id/test",
  validatorMiddleware({ params: channelParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(channelController.testConnection),
);
