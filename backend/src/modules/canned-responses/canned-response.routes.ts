import { Router, type NextFunction, type Request, type Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { rbacMiddleware } from "../../middleware/rbac.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { cannedResponseController } from "./canned-response.controller";
import {
  cannedResponseParamsSchema,
  createCannedResponseSchema,
  listCannedResponsesQuerySchema,
  orgIdParamsSchema,
  updateCannedResponseSchema,
} from "./canned-response.validators";

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

export const cannedResponseRouter = Router();

cannedResponseRouter.use(authMiddleware);

cannedResponseRouter.get(
  "/:orgId/canned-responses",
  validatorMiddleware({ params: orgIdParamsSchema, query: listCannedResponsesQuerySchema }),
  asyncHandler(cannedResponseController.list),
);
cannedResponseRouter.post(
  "/:orgId/canned-responses",
  validatorMiddleware({ params: orgIdParamsSchema, body: createCannedResponseSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(cannedResponseController.create),
);
cannedResponseRouter.patch(
  "/:orgId/canned-responses/:id",
  validatorMiddleware({ params: cannedResponseParamsSchema, body: updateCannedResponseSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(cannedResponseController.update),
);
cannedResponseRouter.delete(
  "/:orgId/canned-responses/:id",
  validatorMiddleware({ params: cannedResponseParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(cannedResponseController.remove),
);
