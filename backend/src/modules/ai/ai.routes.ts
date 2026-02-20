import { Router } from "express";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { aiRateLimiter } from "../../middleware/rateLimiter.middleware";
import { rbacMiddleware } from "../../middleware/rbac.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { aiController } from "./ai.controller";
import {
  aiTestSchema,
  orgIdParamsSchema,
  trainingDocParamsSchema,
  updateAiSettingsSchema,
} from "./ai.validators";

export const aiRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

aiRouter.use(authMiddleware);

aiRouter.get(
  "/:orgId/ai/settings",
  validatorMiddleware({ params: orgIdParamsSchema }),
  asyncHandler(aiController.getSettings),
);

aiRouter.patch(
  "/:orgId/ai/settings",
  validatorMiddleware({ params: orgIdParamsSchema, body: updateAiSettingsSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(aiController.updateSettings),
);

aiRouter.get(
  "/:orgId/ai/training",
  validatorMiddleware({ params: orgIdParamsSchema }),
  asyncHandler(aiController.listTrainingDocs),
);

aiRouter.post(
  "/:orgId/ai/training",
  validatorMiddleware({ params: orgIdParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  upload.single("file"),
  asyncHandler(aiController.createTrainingDoc),
);

aiRouter.delete(
  "/:orgId/ai/training/:id",
  validatorMiddleware({ params: trainingDocParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(aiController.deleteTrainingDoc),
);

aiRouter.post(
  "/:orgId/ai/test",
  aiRateLimiter,
  validatorMiddleware({ params: orgIdParamsSchema, body: aiTestSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(aiController.testAi),
);
