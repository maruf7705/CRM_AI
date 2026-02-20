import { Router, type NextFunction, type Request, type Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { rbacMiddleware } from "../../middleware/rbac.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { contactController } from "./contact.controller";
import {
  addContactTagsSchema,
  contactConversationsQuerySchema,
  contactParamsSchema,
  contactTagParamsSchema,
  createContactSchema,
  listContactsQuerySchema,
  orgIdParamsSchema,
  updateContactSchema,
} from "./contact.validators";

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

export const contactRouter = Router();

contactRouter.use(authMiddleware);

contactRouter.get(
  "/:orgId/contacts",
  validatorMiddleware({ params: orgIdParamsSchema, query: listContactsQuerySchema }),
  asyncHandler(contactController.listContacts),
);
contactRouter.post(
  "/:orgId/contacts",
  validatorMiddleware({ params: orgIdParamsSchema, body: createContactSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(contactController.createContact),
);
contactRouter.get(
  "/:orgId/contacts/:id",
  validatorMiddleware({ params: contactParamsSchema }),
  asyncHandler(contactController.getContact),
);
contactRouter.patch(
  "/:orgId/contacts/:id",
  validatorMiddleware({ params: contactParamsSchema, body: updateContactSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(contactController.updateContact),
);
contactRouter.delete(
  "/:orgId/contacts/:id",
  validatorMiddleware({ params: contactParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN"]),
  asyncHandler(contactController.deleteContact),
);
contactRouter.post(
  "/:orgId/contacts/:id/tags",
  validatorMiddleware({ params: contactParamsSchema, body: addContactTagsSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(contactController.addTags),
);
contactRouter.delete(
  "/:orgId/contacts/:id/tags/:tagId",
  validatorMiddleware({ params: contactTagParamsSchema }),
  rbacMiddleware(["OWNER", "ADMIN", "AGENT"]),
  asyncHandler(contactController.removeTag),
);
contactRouter.get(
  "/:orgId/contacts/:id/conversations",
  validatorMiddleware({ params: contactParamsSchema, query: contactConversationsQuerySchema }),
  asyncHandler(contactController.listContactConversations),
);
