import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { conversationService } from "./conversation.service";
import type {
  AssignConversationInput,
  ListConversationsQuery,
  UpdateConversationAiInput,
  UpdateConversationInput,
} from "./conversation.validators";

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

const requireConversationId = (req: Request): string => {
  const conversationId = req.params.id;
  if (!conversationId) {
    throw new BadRequestError("Conversation id is required");
  }

  return conversationId;
};

export class ConversationController {
  listConversations = async (req: Request, res: Response): Promise<void> => {
    const payload = await conversationService.listConversations(
      requireActorId(req),
      requireOrgId(req),
      req.query as ListConversationsQuery,
    );

    res.status(200).json({
      success: true,
      data: payload.data,
      meta: payload.meta,
    });
  };

  getConversation = async (req: Request, res: Response): Promise<void> => {
    const data = await conversationService.getConversation(
      requireActorId(req),
      requireOrgId(req),
      requireConversationId(req),
    );

    res.status(200).json({ success: true, data });
  };

  updateConversation = async (req: Request, res: Response): Promise<void> => {
    const data = await conversationService.updateConversation(
      requireActorId(req),
      requireOrgId(req),
      requireConversationId(req),
      req.body as UpdateConversationInput,
    );

    res.status(200).json({ success: true, data });
  };

  closeConversation = async (req: Request, res: Response): Promise<void> => {
    const data = await conversationService.closeConversation(
      requireActorId(req),
      requireOrgId(req),
      requireConversationId(req),
    );

    res.status(200).json({ success: true, data });
  };

  reopenConversation = async (req: Request, res: Response): Promise<void> => {
    const data = await conversationService.reopenConversation(
      requireActorId(req),
      requireOrgId(req),
      requireConversationId(req),
    );

    res.status(200).json({ success: true, data });
  };

  assignConversation = async (req: Request, res: Response): Promise<void> => {
    const data = await conversationService.assignConversation(
      requireActorId(req),
      requireOrgId(req),
      requireConversationId(req),
      req.body as AssignConversationInput,
    );

    res.status(200).json({ success: true, data });
  };

  updateConversationAi = async (req: Request, res: Response): Promise<void> => {
    const data = await conversationService.updateConversationAi(
      requireActorId(req),
      requireOrgId(req),
      requireConversationId(req),
      req.body as UpdateConversationAiInput,
    );

    res.status(200).json({ success: true, data });
  };
}

export const conversationController = new ConversationController();

