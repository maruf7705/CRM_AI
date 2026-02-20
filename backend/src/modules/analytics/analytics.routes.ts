import { Router, type NextFunction, type Request, type Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { rbacMiddleware } from "../../middleware/rbac.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { analyticsController } from "./analytics.controller";
import { analyticsRangeQuerySchema, orgIdParamsSchema } from "./analytics.validators";

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

export const analyticsRouter = Router();

analyticsRouter.use(authMiddleware);

analyticsRouter.get(
  "/:orgId/analytics/overview",
  validatorMiddleware({ params: orgIdParamsSchema, query: analyticsRangeQuerySchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(analyticsController.getOverview),
);

analyticsRouter.get(
  "/:orgId/analytics/agents",
  validatorMiddleware({ params: orgIdParamsSchema, query: analyticsRangeQuerySchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(analyticsController.getAgents),
);

analyticsRouter.get(
  "/:orgId/analytics/channels",
  validatorMiddleware({ params: orgIdParamsSchema, query: analyticsRangeQuerySchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(analyticsController.getChannels),
);

analyticsRouter.get(
  "/:orgId/analytics/ai",
  validatorMiddleware({ params: orgIdParamsSchema, query: analyticsRangeQuerySchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(analyticsController.getAi),
);
