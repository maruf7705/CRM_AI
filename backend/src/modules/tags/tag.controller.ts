import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { tagService } from "./tag.service";
import type { CreateTagInput, UpdateTagInput } from "./tag.validators";

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

const requireTagId = (req: Request): string => {
  const tagId = req.params.id;
  if (!tagId) {
    throw new BadRequestError("Tag id is required");
  }

  return tagId;
};

export class TagController {
  listTags = async (req: Request, res: Response): Promise<void> => {
    const data = await tagService.listTags(requireActorId(req), requireOrgId(req));
    res.status(200).json({ success: true, data });
  };

  createTag = async (req: Request, res: Response): Promise<void> => {
    const data = await tagService.createTag(
      requireActorId(req),
      requireOrgId(req),
      req.body as CreateTagInput,
    );

    res.status(201).json({ success: true, data });
  };

  updateTag = async (req: Request, res: Response): Promise<void> => {
    const data = await tagService.updateTag(
      requireActorId(req),
      requireOrgId(req),
      requireTagId(req),
      req.body as UpdateTagInput,
    );

    res.status(200).json({ success: true, data });
  };

  deleteTag = async (req: Request, res: Response): Promise<void> => {
    await tagService.deleteTag(requireActorId(req), requireOrgId(req), requireTagId(req));
    res.status(200).json({ success: true, data: { message: "Tag deleted" } });
  };
}

export const tagController = new TagController();
