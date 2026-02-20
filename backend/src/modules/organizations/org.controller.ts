import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { orgService } from "./org.service";
import type { InviteMemberInput, UpdateMemberInput, UpdateOrgInput } from "./org.validators";

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

const requireMemberId = (req: Request): string => {
  const memberId = req.params.memberId;
  if (!memberId) {
    throw new BadRequestError("Member id is required");
  }

  return memberId;
};

export class OrgController {
  getOrganization = async (req: Request, res: Response): Promise<void> => {
    const data = await orgService.getOrganization(requireActorId(req), requireOrgId(req));
    res.status(200).json({ success: true, data });
  };

  updateOrganization = async (req: Request, res: Response): Promise<void> => {
    const data = await orgService.updateOrganization(
      requireActorId(req),
      requireOrgId(req),
      req.body as UpdateOrgInput,
    );

    res.status(200).json({ success: true, data });
  };

  listMembers = async (req: Request, res: Response): Promise<void> => {
    const data = await orgService.listMembers(requireActorId(req), requireOrgId(req));
    res.status(200).json({ success: true, data });
  };

  inviteMember = async (req: Request, res: Response): Promise<void> => {
    const data = await orgService.inviteMember(
      requireActorId(req),
      requireOrgId(req),
      req.body as InviteMemberInput,
    );

    res.status(201).json({ success: true, data });
  };

  updateMember = async (req: Request, res: Response): Promise<void> => {
    const data = await orgService.updateMember(
      requireActorId(req),
      requireOrgId(req),
      requireMemberId(req),
      req.body as UpdateMemberInput,
    );

    res.status(200).json({ success: true, data });
  };

  removeMember = async (req: Request, res: Response): Promise<void> => {
    await orgService.removeMember(requireActorId(req), requireOrgId(req), requireMemberId(req));
    res.status(200).json({ success: true, data: { message: "Member removed" } });
  };
}

export const orgController = new OrgController();
