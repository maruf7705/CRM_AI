import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { cannedResponseService } from "./canned-response.service";
import type {
  CreateCannedResponseInput,
  ListCannedResponsesQuery,
  UpdateCannedResponseInput,
} from "./canned-response.validators";

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

const requireId = (req: Request): string => {
  const id = req.params.id;
  if (!id) {
    throw new BadRequestError("Canned response id is required");
  }

  return id;
};

export class CannedResponseController {
  list = async (req: Request, res: Response): Promise<void> => {
    const payload = await cannedResponseService.list(
      requireActorId(req),
      requireOrgId(req),
      req.query as ListCannedResponsesQuery,
    );

    res.status(200).json({
      success: true,
      data: payload.data,
      meta: payload.meta,
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await cannedResponseService.create(
      requireActorId(req),
      requireOrgId(req),
      req.body as CreateCannedResponseInput,
    );

    res.status(201).json({ success: true, data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const data = await cannedResponseService.update(
      requireActorId(req),
      requireOrgId(req),
      requireId(req),
      req.body as UpdateCannedResponseInput,
    );

    res.status(200).json({ success: true, data });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await cannedResponseService.remove(requireActorId(req), requireOrgId(req), requireId(req));
    res.status(200).json({ success: true, data: { message: "Canned response deleted" } });
  };
}

export const cannedResponseController = new CannedResponseController();
