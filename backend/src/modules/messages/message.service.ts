import { Prisma } from "@prisma/client";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { decryptJson } from "../../utils/encryption";
import { realtimeService } from "../realtime/realtime.service";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { sanitizeText } from "../../utils/helpers";
import { toCursorLimit } from "../../utils/pagination";
import { getProviderForChannelType } from "../channels/providers/provider-registry";
import { aiService } from "../ai/ai.service";
import type { AiReplyInput, ListMessagesQuery, SendMessageInput } from "./message.validators";

interface MessageResponse {
  id: string;
  externalId?: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  contentType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "LOCATION" | "STICKER" | "TEMPLATE";
  mediaUrl?: string;
  mediaMimeType?: string;
  sender: "CONTACT" | "AGENT" | "AI" | "SYSTEM";
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  isAiGenerated: boolean;
  aiConfidence?: number;
  metadata?: Record<string, unknown>;
  deliveredAt?: Date;
  readAt?: Date;
  failedReason?: string;
  createdAt: Date;
  conversationId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ListMessagesResult {
  data: MessageResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

type MessageRecord = Prisma.MessageGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

type ConversationRecord = Prisma.ConversationGetPayload<{
  include: {
    channel: {
      select: {
        id: true;
        type: true;
        name: true;
        externalId: true;
        credentials: true;
        metadata: true;
      };
    };
    organization: {
      select: {
        aiMode: true;
      };
    };
    contact: {
      select: {
        id: true;
        displayName: true;
        phone: true;
        facebookId: true;
        instagramId: true;
        whatsappId: true;
      };
    };
  };
}>;

const toMessageResponse = (message: MessageRecord): MessageResponse => {
  const payload: MessageResponse = {
    id: message.id,
    direction: message.direction,
    content: message.content,
    contentType: message.contentType,
    sender: message.sender,
    status: message.status,
    isAiGenerated: message.isAiGenerated,
    createdAt: message.createdAt,
    conversationId: message.conversationId,
  };

  if (message.externalId) {
    payload.externalId = message.externalId;
  }

  if (message.mediaUrl) {
    payload.mediaUrl = message.mediaUrl;
  }

  if (message.mediaMimeType) {
    payload.mediaMimeType = message.mediaMimeType;
  }

  if (typeof message.aiConfidence === "number") {
    payload.aiConfidence = message.aiConfidence;
  }

  if (message.metadata && typeof message.metadata === "object") {
    payload.metadata = message.metadata as Record<string, unknown>;
  }

  if (message.deliveredAt) {
    payload.deliveredAt = message.deliveredAt;
  }

  if (message.readAt) {
    payload.readAt = message.readAt;
  }

  if (message.failedReason) {
    payload.failedReason = message.failedReason;
  }

  if (message.user) {
    payload.user = {
      id: message.user.id,
      firstName: message.user.firstName,
      lastName: message.user.lastName,
    };
  }

  return payload;
};

export class MessageService {
  private async emitBroadcast(
    task: () => Promise<void>,
    context: Record<string, unknown>,
  ): Promise<void> {
    try {
      await task();
    } catch (error) {
      logger.warn("Realtime broadcast failed", {
        ...context,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
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

  private async requireConversation(orgId: string, conversationId: string): Promise<ConversationRecord> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: orgId,
      },
      include: {
        channel: {
          select: {
            id: true,
            type: true,
            name: true,
            externalId: true,
            credentials: true,
            metadata: true,
          },
        },
        organization: {
          select: {
            aiMode: true,
          },
        },
        contact: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            facebookId: true,
            instagramId: true,
            whatsappId: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation");
    }

    return conversation;
  }

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

  async listMessages(
    userId: string,
    orgId: string,
    conversationId: string,
    query: ListMessagesQuery,
  ): Promise<ListMessagesResult> {
    await this.requireMembership(userId, orgId);
    await this.requireConversation(orgId, conversationId);

    const limit = toCursorLimit(query, 50);

    let cursorMessage: { id: string; createdAt: Date } | null = null;
    if (query.cursor) {
      cursorMessage = await prisma.message.findFirst({
        where: {
          id: query.cursor,
          conversationId,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      if (!cursorMessage) {
        throw new NotFoundError("Cursor message");
      }
    }

    const where: Prisma.MessageWhereInput = {
      conversationId,
    };

    if (cursorMessage) {
      where.OR = [
        {
          createdAt: {
            lt: cursorMessage.createdAt,
          },
        },
        {
          createdAt: cursorMessage.createdAt,
          id: {
            lt: cursorMessage.id,
          },
        },
      ];
    }

    const rows = await prisma.message.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : undefined;
    const chronological = sliced.slice().reverse();

    return {
      data: chronological.map(toMessageResponse),
      meta: {
        limit,
        hasMore,
        ...(nextCursor ? { nextCursor } : {}),
      },
    };
  }

  async sendMessage(
    userId: string,
    orgId: string,
    conversationId: string,
    input: SendMessageInput,
  ): Promise<MessageResponse> {
    await this.requireMembership(userId, orgId);
    const conversation = await this.requireConversation(orgId, conversationId);

    const content = sanitizeText(input.content);
    if (!content) {
      throw new BadRequestError("Message content is required");
    }

    const now = new Date();
    const preview = content.length > 100 ? `${content.slice(0, 97)}...` : content;

    const createdMessage = await prisma.$transaction(async (tx) => {
      const createData: Prisma.MessageUncheckedCreateInput = {
        conversationId,
        direction: "OUTBOUND",
        sender: "AGENT",
        content,
        contentType: input.contentType,
        mediaUrl: input.mediaUrl ?? null,
        mediaMimeType: input.mediaMimeType ?? null,
        status: "PENDING",
        userId,
      };

      const normalizedMetadata = this.normalizeMetadata(input.metadata);
      if (normalizedMetadata !== undefined) {
        createData.metadata = normalizedMetadata;
      }

      const message = await tx.message.create({
        data: createData,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const updatedConversation = await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          lastMessageAt: now,
          lastMessagePreview: preview,
          unreadCount: 0,
          isAiHandling: false,
        },
      });

      return { message, updatedConversation };
    });

    const supportsProviderDispatch =
      conversation.channel.type === "FACEBOOK" ||
      conversation.channel.type === "INSTAGRAM" ||
      conversation.channel.type === "WHATSAPP";

    let finalMessage = createdMessage.message;

    if (supportsProviderDispatch) {
      try {
        const provider = getProviderForChannelType(conversation.channel.type);
        const credentials = decryptJson<Record<string, unknown>>(conversation.channel.credentials);
        const outboundMessagePayload: {
          id: string;
          content: string;
          contentType: SendMessageInput["contentType"];
          mediaUrl?: string | null;
          mediaMimeType?: string | null;
        } = {
          id: createdMessage.message.id,
          content,
          contentType: input.contentType,
        };

        if (input.mediaUrl !== undefined) {
          outboundMessagePayload.mediaUrl = input.mediaUrl;
        }

        if (input.mediaMimeType !== undefined) {
          outboundMessagePayload.mediaMimeType = input.mediaMimeType;
        }

        const sendResult = await provider.sendMessage({
          conversationId,
          channel: {
            id: conversation.channel.id,
            type: conversation.channel.type,
            name: conversation.channel.name,
            externalId: conversation.channel.externalId,
            credentials,
            metadata:
              conversation.channel.metadata && typeof conversation.channel.metadata === "object"
                ? (conversation.channel.metadata as Record<string, unknown>)
                : null,
          },
          contact: {
            id: conversation.contact.id,
            displayName: conversation.contact.displayName,
            phone: conversation.contact.phone,
            facebookId: conversation.contact.facebookId,
            instagramId: conversation.contact.instagramId,
            whatsappId: conversation.contact.whatsappId,
          },
          message: outboundMessagePayload,
        });

        const updateData: Prisma.MessageUpdateInput = {
          status: sendResult.status,
          failedReason: null,
        };

        if (sendResult.externalMessageId) {
          updateData.externalId = sendResult.externalMessageId;
        }

        if (sendResult.rawResponse) {
          updateData.metadata = {
            provider: conversation.channel.type,
            response: sendResult.rawResponse,
          } as Prisma.InputJsonValue;
        }

        finalMessage = await prisma.message.update({
          where: { id: createdMessage.message.id },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
      } catch (error) {
        const failureReason =
          error instanceof Error ? error.message.slice(0, 500) : "Provider dispatch failed";

        logger.warn("Provider dispatch failed for outbound message", {
          orgId,
          conversationId,
          channelType: conversation.channel.type,
          messageId: createdMessage.message.id,
          error: failureReason,
        });

        finalMessage = await prisma.message.update({
          where: { id: createdMessage.message.id },
          data: {
            status: "FAILED",
            failedReason: failureReason,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
      }
    } else {
      finalMessage = await prisma.message.update({
        where: { id: createdMessage.message.id },
        data: {
          status: "SENT",
          failedReason: null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }

    await prisma.analyticsEvent.create({
      data: {
        organizationId: orgId,
        type: "message_sent",
        channel: conversation.channel.type,
        data: {
          conversationId,
          messageId: finalMessage.id,
          sender: "AGENT",
          status: finalMessage.status,
        },
      },
    });

    const responsePayload = toMessageResponse(finalMessage);

    await Promise.all([
      this.emitBroadcast(
        () =>
          realtimeService.broadcastNewMessage(orgId, responsePayload as unknown as Record<string, unknown>, {
            id: createdMessage.updatedConversation.id,
            lastMessageAt: createdMessage.updatedConversation.lastMessageAt?.toISOString() ?? null,
            lastMessagePreview: createdMessage.updatedConversation.lastMessagePreview ?? null,
            unreadCount: createdMessage.updatedConversation.unreadCount,
            aiEnabled: createdMessage.updatedConversation.aiEnabled,
            isAiHandling: createdMessage.updatedConversation.isAiHandling,
            updatedAt: createdMessage.updatedConversation.updatedAt.toISOString(),
          }),
        { orgId, conversationId, event: "new_message" },
      ),
      this.emitBroadcast(
        () =>
          realtimeService.broadcastConversationUpdate(orgId, conversationId, {
            lastMessageAt: createdMessage.updatedConversation.lastMessageAt?.toISOString() ?? null,
            lastMessagePreview: createdMessage.updatedConversation.lastMessagePreview ?? null,
            unreadCount: createdMessage.updatedConversation.unreadCount,
            aiEnabled: createdMessage.updatedConversation.aiEnabled,
            isAiHandling: createdMessage.updatedConversation.isAiHandling,
            updatedAt: createdMessage.updatedConversation.updatedAt.toISOString(),
          }),
        { orgId, conversationId, event: "conversation_update" },
      ),
      this.emitBroadcast(
        () =>
          realtimeService.broadcastUnreadUpdate(
            orgId,
            conversationId,
            createdMessage.updatedConversation.unreadCount,
          ),
        { orgId, conversationId, event: "unread_update" },
      ),
      this.emitBroadcast(
        () => realtimeService.broadcastMessageStatus(orgId, finalMessage.id, finalMessage.status),
        { orgId, conversationId, event: "message_status" },
      ),
    ]);

    return responsePayload;
  }

  async triggerAiReply(
    userId: string,
    orgId: string,
    conversationId: string,
    input: AiReplyInput,
  ): Promise<{ queued: boolean; message: string }> {
    await this.requireMembership(userId, orgId);
    const payload: {
      organizationId: string;
      conversationId: string;
      requestedByUserId?: string;
      force?: boolean;
    } = {
      organizationId: orgId,
      conversationId,
      requestedByUserId: userId,
    };

    if (input.force !== undefined) {
      payload.force = input.force;
    }

    return aiService.triggerFromConversation(payload);
  }
}

export const messageService = new MessageService();

