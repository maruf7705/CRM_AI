import { Router, type NextFunction, type Request, type Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { rbacMiddleware } from "../../middleware/rbac.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { orgController } from "./org.controller";
import {
  inviteMemberSchema,
  orgIdParamsSchema,
  orgMemberParamsSchema,
  updateMemberSchema,
  updateOrgSchema,
} from "./org.validators";

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

export const orgRouter = Router();

orgRouter.use(authMiddleware);

orgRouter.get("/:orgId", validatorMiddleware({ params: orgIdParamsSchema }), asyncHandler(orgController.getOrganization));
orgRouter.patch(
  "/:orgId",
  validatorMiddleware({ params: orgIdParamsSchema, body: updateOrgSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(orgController.updateOrganization),
);

orgRouter.get(
  "/:orgId/members",
  validatorMiddleware({ params: orgIdParamsSchema }),
  asyncHandler(orgController.listMembers),
);
orgRouter.post(
  "/:orgId/members/invite",
  validatorMiddleware({ params: orgIdParamsSchema, body: inviteMemberSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(orgController.inviteMember),
);
orgRouter.patch(
  "/:orgId/members/:memberId",
  validatorMiddleware({ params: orgMemberParamsSchema, body: updateMemberSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(orgController.updateMember),
);
orgRouter.delete(
  "/:orgId/members/:memberId",
  validatorMiddleware({ params: orgMemberParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(orgController.removeMember),
);
