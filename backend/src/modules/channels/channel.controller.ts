import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { channelService } from "./channel.service";
import type {
  CreateChannelInput,
  OauthConnectCallbackInput,
  OauthConnectType,
  OauthConnectUrlQuery,
  UpdateChannelInput,
} from "./channel.validators";

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

const requireChannelId = (req: Request): string => {
  const channelId = req.params.id;
  if (!channelId) {
    throw new BadRequestError("Channel id is required");
  }

  return channelId;
};

const requireConnectType = (req: Request): OauthConnectType => {
  const type = req.params.type;
  if (!type) {
    throw new BadRequestError("Connect type is required");
  }

  const normalized = type.toUpperCase();
  if (normalized !== "FACEBOOK" && normalized !== "INSTAGRAM") {
    throw new BadRequestError("Unsupported connect type");
  }

  return normalized;
};

export class ChannelController {
  listChannels = async (req: Request, res: Response): Promise<void> => {
    const data = await channelService.listChannels(requireActorId(req), requireOrgId(req));
    res.status(200).json({ success: true, data });
  };

  createChannel = async (req: Request, res: Response): Promise<void> => {
    const data = await channelService.createChannel(
      requireActorId(req),
      requireOrgId(req),
      req.body as CreateChannelInput,
    );

    res.status(201).json({ success: true, data });
  };

  buildOauthConnectUrl = async (req: Request, res: Response): Promise<void> => {
    const data = await channelService.buildOauthConnectUrl(
      requireActorId(req),
      requireOrgId(req),
      requireConnectType(req),
      req.query as OauthConnectUrlQuery,
    );

    res.status(200).json({ success: true, data });
  };

  completeOauthConnect = async (req: Request, res: Response): Promise<void> => {
    const data = await channelService.completeOauthConnect(
      requireActorId(req),
      requireOrgId(req),
      requireConnectType(req),
      req.body as OauthConnectCallbackInput,
    );

    res.status(200).json({ success: true, data });
  };

  getChannel = async (req: Request, res: Response): Promise<void> => {
    const data = await channelService.getChannel(
      requireActorId(req),
      requireOrgId(req),
      requireChannelId(req),
    );

    res.status(200).json({ success: true, data });
  };

  updateChannel = async (req: Request, res: Response): Promise<void> => {
    const data = await channelService.updateChannel(
      requireActorId(req),
      requireOrgId(req),
      requireChannelId(req),
      req.body as UpdateChannelInput,
    );

    res.status(200).json({ success: true, data });
  };

  disconnectChannel = async (req: Request, res: Response): Promise<void> => {
    await channelService.disconnectChannel(requireActorId(req), requireOrgId(req), requireChannelId(req));
    res.status(200).json({ success: true, data: { message: "Channel disconnected" } });
  };

  testConnection = async (req: Request, res: Response): Promise<void> => {
    const data = await channelService.testConnection(
      requireActorId(req),
      requireOrgId(req),
      requireChannelId(req),
    );

    res.status(200).json({ success: true, data });
  };
}

export const channelController = new ChannelController();

