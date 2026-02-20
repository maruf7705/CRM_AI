import { Router, type NextFunction, type Request, type Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { rbacMiddleware } from "../../middleware/rbac.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { tagController } from "./tag.controller";
import { createTagSchema, orgIdParamsSchema, tagParamsSchema, updateTagSchema } from "./tag.validators";

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

export const tagRouter = Router();

tagRouter.use(authMiddleware);

tagRouter.get(
  "/:orgId/tags",
  validatorMiddleware({ params: orgIdParamsSchema }),
  asyncHandler(tagController.listTags),
);
tagRouter.post(
  "/:orgId/tags",
  validatorMiddleware({ params: orgIdParamsSchema, body: createTagSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(tagController.createTag),
);
tagRouter.patch(
  "/:orgId/tags/:id",
  validatorMiddleware({ params: tagParamsSchema, body: updateTagSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(tagController.updateTag),
);
tagRouter.delete(
  "/:orgId/tags/:id",
  validatorMiddleware({ params: tagParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(tagController.deleteTag),
);
