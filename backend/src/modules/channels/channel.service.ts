import { randomUUID } from "node:crypto";
import { Prisma, type Channel, type ChannelType } from "@prisma/client";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { decryptJson, encryptJson } from "../../utils/encryption";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { sanitizeText } from "../../utils/helpers";
import { getProviderByConnectType, getProviderForChannelType } from "./providers/provider-registry";
import type {
  CreateChannelInput,
  OauthConnectCallbackInput,
  OauthConnectType,
  OauthConnectUrlQuery,
  UpdateChannelInput,
} from "./channel.validators";

interface ChannelResponse {
  id: string;
  type: ChannelType;
  name: string;
  isActive: boolean;
  externalId?: string;
  webhookSecret?: string;
  metadata?: Record<string, unknown>;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  hasCredentials: boolean;
}

interface ChannelDetailResponse extends ChannelResponse {
  credentialsPreview?: Record<string, unknown>;
}

interface ChannelConnectUrlResponse {
  type: OauthConnectType;
  authUrl: string;
  state: string;
}

interface ChannelConnectCallbackResponse {
  channel: ChannelResponse;
  isNew: boolean;
}

interface ChannelTestResponse {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

const toChannelResponse = (channel: Channel): ChannelResponse => {
  const payload: ChannelResponse = {
    id: channel.id,
    type: channel.type,
    name: channel.name,
    isActive: channel.isActive,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
    hasCredentials: Boolean(channel.credentials),
  };

  if (channel.externalId) {
    payload.externalId = channel.externalId;
  }

  if (channel.webhookSecret) {
    payload.webhookSecret = channel.webhookSecret;
  }

  if (channel.metadata && typeof channel.metadata === "object") {
    payload.metadata = channel.metadata as Record<string, unknown>;
  }

  if (channel.lastSyncAt) {
    payload.lastSyncAt = channel.lastSyncAt;
  }

  return payload;
};

const toChannelDetailResponse = (channel: Channel): ChannelDetailResponse => {
  const payload: ChannelDetailResponse = toChannelResponse(channel);

  try {
    const decrypted = decryptJson<Record<string, unknown>>(channel.credentials);
    const preview: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(decrypted)) {
      if (typeof value === "string") {
        preview[key] = value.length > 6 ? `${value.slice(0, 3)}***${value.slice(-2)}` : "***";
      } else {
        preview[key] = value;
      }
    }

    payload.credentialsPreview = preview;
  } catch {
    return payload;
  }

  return payload;
};

export class ChannelService {
  private normalizeMetadata(
    metadata: Record<string, unknown> | null | undefined,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (metadata === undefined) {
      return undefined;
    }

    if (metadata === null) {
      return Prisma.JsonNull;
    }

    return metadata as Prisma.InputJsonValue;
  }

  private async requireMembership(userId: string, orgId: string): Promise<void> {
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenError("You do not have access to this organization");
    }
  }

  private async requireChannel(orgId: string, channelId: string): Promise<Channel> {
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        organizationId: orgId,
      },
    });

    if (!channel) {
      throw new NotFoundError("Channel");
    }

    return channel;
  }

  async listChannels(userId: string, orgId: string): Promise<ChannelResponse[]> {
    await this.requireMembership(userId, orgId);

    const channels = await prisma.channel.findMany({
      where: { organizationId: orgId },
      orderBy: [{ createdAt: "desc" }],
    });

    return channels.map(toChannelResponse);
  }

  async createChannel(userId: string, orgId: string, input: CreateChannelInput): Promise<ChannelResponse> {
    await this.requireMembership(userId, orgId);

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        maxChannels: true,
      },
    });

    if (!organization) {
      throw new NotFoundError("Organization");
    }

    const channelCount = await prisma.channel.count({ where: { organizationId: orgId } });
    if (channelCount >= organization.maxChannels) {
      throw new BadRequestError(`Organization has reached max channel limit (${organization.maxChannels})`);
    }

    const externalId = input.externalId ? sanitizeText(input.externalId) : null;
    if (externalId) {
      const existing = await prisma.channel.findFirst({
        where: {
          organizationId: orgId,
          type: input.type,
          externalId,
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictError("A channel with this external id already exists");
      }
    }

    const createData: Prisma.ChannelUncheckedCreateInput = {
      organizationId: orgId,
      type: input.type,
      name: sanitizeText(input.name),
      externalId,
      webhookSecret: input.webhookSecret ? sanitizeText(input.webhookSecret) : null,
      credentials: encryptJson(input.credentials),
      isActive: input.isActive ?? true,
    };

    const normalizedMetadata = this.normalizeMetadata(input.metadata);
    if (normalizedMetadata !== undefined) {
      createData.metadata = normalizedMetadata;
    }

    const channel = await prisma.channel.create({ data: createData });

    return toChannelResponse(channel);
  }

  async buildOauthConnectUrl(
    userId: string,
    orgId: string,
    type: OauthConnectType,
    query: OauthConnectUrlQuery,
  ): Promise<ChannelConnectUrlResponse> {
    await this.requireMembership(userId, orgId);

    const provider = getProviderByConnectType(type);
    const state = query.state ?? randomUUID();
    const result = await provider.buildConnectUrl({
      redirectUri: query.redirectUri,
      state,
    });

    return {
      type,
      authUrl: result.authUrl,
      state: result.state,
    };
  }

  async completeOauthConnect(
    userId: string,
    orgId: string,
    type: OauthConnectType,
    input: OauthConnectCallbackInput,
  ): Promise<ChannelConnectCallbackResponse> {
    await this.requireMembership(userId, orgId);

    const provider = getProviderByConnectType(type);
    const exchangeInput: {
      code: string;
      redirectUri: string;
      channelName?: string;
      externalId?: string;
    } = {
      code: input.code,
      redirectUri: input.redirectUri,
    };

    if (input.channelName) {
      exchangeInput.channelName = input.channelName;
    }

    if (input.externalId) {
      exchangeInput.externalId = input.externalId;
    }

    const connectResult = await provider.exchangeCode(exchangeInput);

    const externalId = sanitizeText(connectResult.externalId);
    if (!externalId) {
      throw new BadRequestError("OAuth provider did not return a valid external id");
    }
    const channelName = sanitizeText(connectResult.channelName);
    if (!channelName) {
      throw new BadRequestError("OAuth provider did not return a valid channel name");
    }

    const existing = await prisma.channel.findFirst({
      where: {
        organizationId: orgId,
        type,
        externalId,
      },
    });

    const metadata = this.normalizeMetadata(connectResult.metadata);
    const now = new Date();

    if (existing) {
      const updateData: Prisma.ChannelUpdateInput = {
        name: channelName,
        credentials: encryptJson(connectResult.credentials),
        isActive: true,
        lastSyncAt: now,
      };

      if (metadata !== undefined) {
        updateData.metadata = metadata;
      }

      const updated = await prisma.channel.update({
        where: { id: existing.id },
        data: updateData,
      });

      return {
        channel: toChannelResponse(updated),
        isNew: false,
      };
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        maxChannels: true,
      },
    });

    if (!organization) {
      throw new NotFoundError("Organization");
    }

    const currentChannelsCount = await prisma.channel.count({
      where: { organizationId: orgId },
    });

    if (currentChannelsCount >= organization.maxChannels) {
      throw new BadRequestError(`Organization has reached max channel limit (${organization.maxChannels})`);
    }

    const createData: Prisma.ChannelUncheckedCreateInput = {
      organizationId: orgId,
      type,
      name: channelName,
      externalId,
      credentials: encryptJson(connectResult.credentials),
      isActive: true,
      lastSyncAt: now,
    };

    if (metadata !== undefined) {
      createData.metadata = metadata;
    }

    const created = await prisma.channel.create({
      data: createData,
    });

    return {
      channel: toChannelResponse(created),
      isNew: true,
    };
  }

  async getChannel(userId: string, orgId: string, channelId: string): Promise<ChannelDetailResponse> {
    await this.requireMembership(userId, orgId);
    const channel = await this.requireChannel(orgId, channelId);
    return toChannelDetailResponse(channel);
  }

  async updateChannel(
    userId: string,
    orgId: string,
    channelId: string,
    input: UpdateChannelInput,
  ): Promise<ChannelResponse> {
    await this.requireMembership(userId, orgId);
    const current = await this.requireChannel(orgId, channelId);

    const updateData: Prisma.ChannelUpdateInput = {};

    if (input.name !== undefined) {
      updateData.name = sanitizeText(input.name);
    }

    if (input.externalId !== undefined) {
      const externalId = input.externalId ? sanitizeText(input.externalId) : null;

      if (externalId) {
        const duplicate = await prisma.channel.findFirst({
          where: {
            organizationId: orgId,
            type: current.type,
            externalId,
            id: { not: channelId },
          },
          select: { id: true },
        });

        if (duplicate) {
          throw new ConflictError("A channel with this external id already exists");
        }
      }

      updateData.externalId = externalId;
    }

    if (input.webhookSecret !== undefined) {
      updateData.webhookSecret = input.webhookSecret ? sanitizeText(input.webhookSecret) : null;
    }

    if (input.metadata !== undefined) {
      const normalizedMetadata = this.normalizeMetadata(input.metadata);
      if (normalizedMetadata !== undefined) {
        updateData.metadata = normalizedMetadata;
      }
    }

    if (input.credentials !== undefined) {
      updateData.credentials = encryptJson(input.credentials);
    }

    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    if (input.lastSyncAt !== undefined) {
      updateData.lastSyncAt = input.lastSyncAt ? new Date(input.lastSyncAt) : null;
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: updateData,
    });

    return toChannelResponse(updated);
  }

  async disconnectChannel(userId: string, orgId: string, channelId: string): Promise<void> {
    await this.requireMembership(userId, orgId);
    await this.requireChannel(orgId, channelId);

    await prisma.channel.delete({ where: { id: channelId } });
  }

  async testConnection(userId: string, orgId: string, channelId: string): Promise<ChannelTestResponse> {
    await this.requireMembership(userId, orgId);
    const channel = await this.requireChannel(orgId, channelId);

    try {
      const credentials = decryptJson<Record<string, unknown>>(channel.credentials);
      if (channel.type === "FACEBOOK" || channel.type === "INSTAGRAM" || channel.type === "WHATSAPP") {
        const provider = getProviderForChannelType(channel.type);
        const providerResult = await provider.testConnection({
          id: channel.id,
          type: channel.type,
          name: channel.name,
          externalId: channel.externalId,
          credentials,
          metadata:
            channel.metadata && typeof channel.metadata === "object"
              ? (channel.metadata as Record<string, unknown>)
              : null,
        });

        await prisma.channel.update({
          where: { id: channel.id },
          data: {
            lastSyncAt: providerResult.success ? new Date() : channel.lastSyncAt,
          },
        });

        return providerResult;
      }

      const hasSomeCredential = Object.keys(credentials).length > 0;
      return {
        success: hasSomeCredential,
        message: hasSomeCredential ? "Channel credentials are valid" : "Channel credentials are empty",
      };
    } catch (error) {
      logger.warn("Channel connection test failed", {
        orgId,
        channelId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : "Channel connection test failed",
      };
    }
  }
}

export const channelService = new ChannelService();
