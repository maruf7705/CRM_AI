import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { contactService } from "./contact.service";
import type {
  AddContactTagsInput,
  ContactConversationsQuery,
  CreateContactInput,
  ListContactsQuery,
  UpdateContactInput,
} from "./contact.validators";

const requireActorId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
};

const requireOrgId = (req: Request): string => {
  const orgId = req.params.orgId;
  if (!orgId) {
    throw new BadRequestError("Organization id is required");
  }

  return orgId;
};

const requireContactId = (req: Request): string => {
  const contactId = req.params.id;
  if (!contactId) {
    throw new BadRequestError("Contact id is required");
  }

  return contactId;
};

const requireTagId = (req: Request): string => {
  const tagId = req.params.tagId;
  if (!tagId) {
    throw new BadRequestError("Tag id is required");
  }

  return tagId;
};

export class ContactController {
  listContacts = async (req: Request, res: Response): Promise<void> => {
    const payload = await contactService.listContacts(
      requireActorId(req),
      requireOrgId(req),
      req.query as ListContactsQuery,
    );

    res.status(200).json({
      success: true,
      data: payload.data,
      meta: payload.meta,
    });
  };

  createContact = async (req: Request, res: Response): Promise<void> => {
    const data = await contactService.createContact(
      requireActorId(req),
      requireOrgId(req),
      req.body as CreateContactInput,
    );

    res.status(201).json({ success: true, data });
  };

  getContact = async (req: Request, res: Response): Promise<void> => {
    const data = await contactService.getContact(
      requireActorId(req),
      requireOrgId(req),
      requireContactId(req),
    );

    res.status(200).json({ success: true, data });
  };

  updateContact = async (req: Request, res: Response): Promise<void> => {
    const data = await contactService.updateContact(
      requireActorId(req),
      requireOrgId(req),
      requireContactId(req),
      req.body as UpdateContactInput,
    );

    res.status(200).json({ success: true, data });
  };

  deleteContact = async (req: Request, res: Response): Promise<void> => {
    await contactService.deleteContact(requireActorId(req), requireOrgId(req), requireContactId(req));
    res.status(200).json({ success: true, data: { message: "Contact deleted" } });
  };

  addTags = async (req: Request, res: Response): Promise<void> => {
    const data = await contactService.addTags(
      requireActorId(req),
      requireOrgId(req),
      requireContactId(req),
      req.body as AddContactTagsInput,
    );

    res.status(200).json({ success: true, data });
  };

  removeTag = async (req: Request, res: Response): Promise<void> => {
    const data = await contactService.removeTag(
      requireActorId(req),
      requireOrgId(req),
      requireContactId(req),
      requireTagId(req),
    );

    res.status(200).json({ success: true, data });
  };

  listContactConversations = async (req: Request, res: Response): Promise<void> => {
    const payload = await contactService.listContactConversations(
      requireActorId(req),
      requireOrgId(req),
      requireContactId(req),
      req.query as ContactConversationsQuery,
    );

    res.status(200).json({
      success: true,
      data: payload.data,
      meta: payload.meta,
    });
  };
}

export const contactController = new ContactController();

