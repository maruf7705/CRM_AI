import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { messageService } from "./message.service";
import type { AiReplyInput, ListMessagesQuery, SendMessageInput } from "./message.validators";

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
  const conversationId = req.params.convId;
  if (!conversationId) {
    throw new BadRequestError("Conversation id is required");
  }

  return conversationId;
};

export class MessageController {
  listMessages = async (req: Request, res: Response): Promise<void> => {
    const payload = await messageService.listMessages(
      requireActorId(req),
      requireOrgId(req),
      requireConversationId(req),
      req.query as ListMessagesQuery,
    );

    res.status(200).json({
      success: true,
      data: payload.data,
      meta: payload.meta,
    });
  };

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const data = await messageService.sendMessage(
      requireActorId(req),
      requireOrgId(req),
      requireConversationId(req),
      req.body as SendMessageInput,
    );

    res.status(201).json({ success: true, data });
  };

  triggerAiReply = async (req: Request, res: Response): Promise<void> => {
    const data = await messageService.triggerAiReply(
      requireActorId(req),
      requireOrgId(req),
      requireConversationId(req),
      req.body as AiReplyInput,
    );

    res.status(200).json({ success: true, data });
  };
}

export const messageController = new MessageController();

