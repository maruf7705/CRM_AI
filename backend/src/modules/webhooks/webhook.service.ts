import type { ChannelType, MessageStatus, Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { sanitizeText } from "../../utils/helpers";
import { getProviderForChannelType } from "../channels/providers/provider-registry";
import { realtimeService } from "../realtime/realtime.service";
import { aiService } from "../ai/ai.service";
import { FacebookProcessor } from "./processors/facebook.processor";
import { InstagramProcessor } from "./processors/instagram.processor";
import type {
  NormalizedInboundMessage,
  NormalizedMessageStatusUpdate,
  ParsedWebhookEvents,
} from "./processors/types";
import { WhatsappProcessor } from "./processors/whatsapp.processor";

type WebhookSource = "FACEBOOK" | "INSTAGRAM" | "WHATSAPP";

interface WebhookProcessSummary {
  processedInbound: number;
  processedStatuses: number;
  skipped: number;
}

interface ResolvedChannel {
  id: string;
  type: ChannelType;
  name: string;
  organizationId: string;
  externalId: string | null;
  webhookSecret: string | null;
}

const STATUS_RANK: Record<MessageStatus, number> = {
  PENDING: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: 5,
};

const isMessageStatusUpgrade = (current: MessageStatus, next: MessageStatus): boolean => {
  if (current === "FAILED") {
    return next === "FAILED";
  }

  return STATUS_RANK[next] >= STATUS_RANK[current];
};

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3))}...` : value;

const asJsonValue = (payload: Record<string, unknown>): Prisma.InputJsonValue =>
  payload as Prisma.InputJsonValue;

export class WebhookService {
  private readonly facebookProcessor = new FacebookProcessor();
  private readonly instagramProcessor = new InstagramProcessor();
  private readonly whatsappProcessor = new WhatsappProcessor();

  private resolveProcessor(source: WebhookSource): { parse: (payload: unknown) => ParsedWebhookEvents } {
    switch (source) {
      case "FACEBOOK":
        return this.facebookProcessor;
      case "INSTAGRAM":
        return this.instagramProcessor;
      case "WHATSAPP":
        return this.whatsappProcessor;
      default:
        throw new BadRequestError("Unsupported webhook source");
    }
  }

  private resolveChallengeToken(source: WebhookSource): string | undefined {
    if (source === "WHATSAPP") {
      return env.WHATSAPP_VERIFY_TOKEN;
    }

    return env.FACEBOOK_VERIFY_TOKEN;
  }

  verifyChallenge(
    source: WebhookSource,
    mode: string | null | undefined,
    verifyToken: string | null | undefined,
    challenge: string | null | undefined,
  ): string {
    if (mode !== "subscribe" || !challenge) {
      throw new BadRequestError("Invalid verification challenge");
    }

    const expectedToken = this.resolveChallengeToken(source);
    if (!expectedToken) {
      throw new BadRequestError(`${source} verify token is not configured`);
    }

    if (!verifyToken || verifyToken !== expectedToken) {
      throw new UnauthorizedError("Invalid webhook verify token");
    }

    return challenge;
  }

  private verifySignature(source: WebhookSource, rawBody: Buffer, signatureHeader: string | undefined): void {
    const signingSecret = source === "WHATSAPP" ? env.FACEBOOK_APP_SECRET : env.FACEBOOK_APP_SECRET;

    if (!signingSecret) {
      if (env.NODE_ENV === "production") {
        throw new UnauthorizedError("Webhook signature secret is not configured");
      }

      logger.warn("Skipping signature verification because app secret is not configured", {
        source,
      });
      return;
    }

    if (!signatureHeader) {
      throw new UnauthorizedError("Webhook signature header is missing");
    }

    const provider = getProviderForChannelType(source);
    const valid = provider.verifySignature(rawBody, signatureHeader, signingSecret);
    if (!valid) {
      throw new UnauthorizedError("Invalid webhook signature");
    }
  }

  private async resolveChannel(
    channelType: ChannelType,
    channelExternalId: string,
  ): Promise<ResolvedChannel | null> {
    const channel = await prisma.channel.findFirst({
      where: {
        type: channelType,
        externalId: channelExternalId,
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        name: true,
        organizationId: true,
        externalId: true,
        webhookSecret: true,
      },
    });

    if (!channel) {
      return null;
    }

    return channel;
  }

  private async logWebhookEvent(
    organizationId: string,
    source: ChannelType,
    direction: string,
    payload: Record<string, unknown>,
    statusCode: number,
    error?: string,
  ): Promise<void> {
    await prisma.webhookLog.create({
      data: {
        organizationId,
        source,
        direction,
        payload: asJsonValue(payload),
        statusCode,
        error: error ?? null,
        processedAt: new Date(),
      },
    });
  }

  private async upsertContactFromEvent(
    organizationId: string,
    event: NormalizedInboundMessage,
  ): Promise<{
    id: string;
    displayName: string;
    phone: string | null;
    facebookId: string | null;
    instagramId: string | null;
    whatsappId: string | null;
  }> {
    const displayName = sanitizeText(event.contactName ?? event.contactExternalId) || "Unknown Contact";

    const contactWhere: Prisma.ContactWhereInput = {
      organizationId,
      ...(event.channelType === "FACEBOOK"
        ? { facebookId: event.contactExternalId }
        : event.channelType === "INSTAGRAM"
          ? { instagramId: event.contactExternalId }
          : { whatsappId: event.contactExternalId }),
    };

    const existing = await prisma.contact.findFirst({
      where: contactWhere,
      select: {
        id: true,
        displayName: true,
        phone: true,
        facebookId: true,
        instagramId: true,
        whatsappId: true,
      },
    });

    if (existing) {
      if (existing.displayName === displayName || !event.contactName) {
        return existing;
      }

      return prisma.contact.update({
        where: { id: existing.id },
        data: {
          displayName,
        },
        select: {
          id: true,
          displayName: true,
          phone: true,
          facebookId: true,
          instagramId: true,
          whatsappId: true,
        },
      });
    }

    const nameParts = displayName.split(" ");
    const firstName = nameParts[0] ?? displayName;
    const lastName = nameParts.slice(1).join(" ").trim();

    const createData: Prisma.ContactUncheckedCreateInput = {
      organizationId,
      displayName,
      firstName: firstName || null,
      lastName: lastName || null,
      stage: "NEW",
    };

    if (event.channelType === "FACEBOOK") {
      createData.facebookId = event.contactExternalId;
    } else if (event.channelType === "INSTAGRAM") {
      createData.instagramId = event.contactExternalId;
    } else {
      createData.whatsappId = event.contactExternalId;
      createData.phone = event.contactExternalId;
    }

    return prisma.contact.create({
      data: createData,
      select: {
        id: true,
        displayName: true,
        phone: true,
        facebookId: true,
        instagramId: true,
        whatsappId: true,
      },
    });
  }

  private async determineNotificationRecipients(
    organizationId: string,
    assignedToId: string | null,
  ): Promise<string[]> {
    if (assignedToId) {
      return [assignedToId];
    }

    const members = await prisma.orgMember.findMany({
      where: {
        organizationId,
        role: {
          in: ["OWNER", "ADMIN", "AGENT"],
        },
        user: {
          isActive: true,
        },
      },
      select: {
        userId: true,
      },
    });

    return members.map((member) => member.userId);
  }

  private async processInboundEvent(event: NormalizedInboundMessage): Promise<boolean> {
    const channel = await this.resolveChannel(event.channelType, event.channelExternalId);
    if (!channel) {
      logger.warn("Webhook event skipped: channel not found", {
        channelType: event.channelType,
        channelExternalId: event.channelExternalId,
      });
      return false;
    }

    const sanitizedContent = sanitizeText(event.content);
    if (!sanitizedContent) {
      await this.logWebhookEvent(
        channel.organizationId,
        event.channelType,
        "INBOUND",
        event.rawPayload,
        422,
        "Empty inbound message content",
      );
      return false;
    }

    const duplicate = event.messageExternalId
      ? await prisma.message.findFirst({
          where: {
            externalId: event.messageExternalId,
            conversation: {
              organizationId: channel.organizationId,
              channelId: channel.id,
            },
          },
          select: {
            id: true,
          },
        })
      : null;

    if (duplicate) {
      await this.logWebhookEvent(channel.organizationId, event.channelType, "INBOUND", event.rawPayload, 200);
      return false;
    }

    const contact = await this.upsertContactFromEvent(channel.organizationId, event);
    const preview = truncate(sanitizedContent, 100);

    let conversation = await prisma.conversation.findFirst({
      where: {
        organizationId: channel.organizationId,
        channelId: channel.id,
        contactId: contact.id,
        ...(event.conversationExternalId ? { externalId: event.conversationExternalId } : {}),
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        assignedToId: true,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.findFirst({
        where: {
          organizationId: channel.organizationId,
          channelId: channel.id,
          contactId: contact.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          assignedToId: true,
        },
      });
    }

    const wasNewConversation = !conversation;
    const recipientUserIds = await this.determineNotificationRecipients(
      channel.organizationId,
      conversation?.assignedToId ?? null,
    );

    const txResult = await prisma.$transaction(async (tx) => {
      const nextConversation = conversation
        ? await tx.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: event.occurredAt,
              lastMessagePreview: preview,
              unreadCount: {
                increment: 1,
              },
            },
            select: {
              id: true,
              unreadCount: true,
              aiEnabled: true,
              isAiHandling: true,
              updatedAt: true,
              assignedToId: true,
              lastMessageAt: true,
              lastMessagePreview: true,
            },
          })
        : await tx.conversation.create({
            data: {
              organizationId: channel.organizationId,
              channelId: channel.id,
              contactId: contact.id,
              externalId: event.conversationExternalId ?? null,
              status: "OPEN",
              priority: "MEDIUM",
              lastMessageAt: event.occurredAt,
              lastMessagePreview: preview,
              unreadCount: 1,
              aiEnabled: true,
              isAiHandling: false,
            },
            select: {
              id: true,
              unreadCount: true,
              aiEnabled: true,
              isAiHandling: true,
              updatedAt: true,
              assignedToId: true,
              lastMessageAt: true,
              lastMessagePreview: true,
            },
          });

      const createdMessage = await tx.message.create({
        data: {
          conversationId: nextConversation.id,
          externalId: event.messageExternalId ?? null,
          direction: "INBOUND",
          sender: "CONTACT",
          content: sanitizedContent,
          contentType: event.contentType,
          mediaUrl: event.mediaUrl ?? null,
          mediaMimeType: event.mediaMimeType ?? null,
          status: "DELIVERED",
          metadata: asJsonValue(event.rawPayload),
          createdAt: event.occurredAt,
        },
        select: {
          id: true,
          conversationId: true,
          content: true,
          direction: true,
          sender: true,
          status: true,
          isAiGenerated: true,
          createdAt: true,
        },
      });

      const notifications: Array<{
        id: string;
        userId: string;
        title: string;
        body: string;
        type: string;
        isRead: boolean;
        createdAt: Date;
      }> = [];

      for (const recipientUserId of recipientUserIds) {
        const createdNotification = await tx.notification.create({
          data: {
            userId: recipientUserId,
            title: "New inbound message",
            body: truncate(`${contact.displayName}: ${preview}`, 180),
            type: "INBOUND_MESSAGE",
            data: {
              conversationId: nextConversation.id,
              messageId: createdMessage.id,
              channelType: event.channelType,
            },
          },
          select: {
            id: true,
            userId: true,
            title: true,
            body: true,
            type: true,
            isRead: true,
            createdAt: true,
          },
        });

        notifications.push(createdNotification);
      }

      await tx.analyticsEvent.create({
        data: {
          organizationId: channel.organizationId,
          type: "message_received",
          channel: channel.type,
          data: {
            conversationId: nextConversation.id,
            messageId: createdMessage.id,
          },
        },
      });

      return {
        conversation: nextConversation,
        message: createdMessage,
        notifications,
      };
    });

    await this.logWebhookEvent(channel.organizationId, event.channelType, "INBOUND", event.rawPayload, 200);

    await Promise.all([
      realtimeService.broadcastNewMessage(channel.organizationId, txResult.message as Record<string, unknown>, {
        id: txResult.conversation.id,
        unreadCount: txResult.conversation.unreadCount,
        lastMessageAt: txResult.conversation.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: txResult.conversation.lastMessagePreview ?? null,
        aiEnabled: txResult.conversation.aiEnabled,
        isAiHandling: txResult.conversation.isAiHandling,
        updatedAt: txResult.conversation.updatedAt.toISOString(),
      }),
      realtimeService.broadcastUnreadUpdate(
        channel.organizationId,
        txResult.conversation.id,
        txResult.conversation.unreadCount,
      ),
      realtimeService.broadcastConversationUpdate(channel.organizationId, txResult.conversation.id, {
        unreadCount: txResult.conversation.unreadCount,
        lastMessageAt: txResult.conversation.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: txResult.conversation.lastMessagePreview ?? null,
        updatedAt: txResult.conversation.updatedAt.toISOString(),
      }),
      ...(wasNewConversation
        ? [
            realtimeService.broadcastNewConversation(channel.organizationId, {
              id: txResult.conversation.id,
              unreadCount: txResult.conversation.unreadCount,
              lastMessagePreview: txResult.conversation.lastMessagePreview ?? null,
              updatedAt: txResult.conversation.updatedAt.toISOString(),
            }),
          ]
        : []),
      ...txResult.notifications.map((notification) =>
        realtimeService.broadcastNotification(notification.userId, notification as Record<string, unknown>),
      ),
    ]);

    void aiService
      .handleInboundMessage({
        organizationId: channel.organizationId,
        conversationId: txResult.conversation.id,
        inboundMessageId: txResult.message.id,
      })
      .catch((error) => {
        logger.warn("Inbound AI processing failed", {
          organizationId: channel.organizationId,
          conversationId: txResult.conversation.id,
          messageId: txResult.message.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });

    return true;
  }

  private async processStatusUpdate(event: NormalizedMessageStatusUpdate): Promise<boolean> {
    const channel = await this.resolveChannel(event.channelType, event.channelExternalId);
    if (!channel) {
      logger.warn("Webhook status skipped: channel not found", {
        channelType: event.channelType,
        channelExternalId: event.channelExternalId,
      });
      return false;
    }

    const currentMessage = await prisma.message.findFirst({
      where: {
        externalId: event.messageExternalId,
        conversation: {
          organizationId: channel.organizationId,
          channelId: channel.id,
        },
      },
      select: {
        id: true,
        conversationId: true,
        status: true,
      },
    });

    if (!currentMessage) {
      await this.logWebhookEvent(
        channel.organizationId,
        event.channelType,
        "STATUS",
        event.rawPayload,
        404,
        "Message not found",
      );
      return false;
    }

    if (!isMessageStatusUpgrade(currentMessage.status, event.status)) {
      await this.logWebhookEvent(channel.organizationId, event.channelType, "STATUS", event.rawPayload, 200);
      return false;
    }

    const updateData: Prisma.MessageUpdateInput = {
      status: event.status,
    };

    if (event.deliveredAt) {
      updateData.deliveredAt = event.deliveredAt;
    }

    if (event.readAt) {
      updateData.readAt = event.readAt;
    }

    if (event.failedReason !== undefined) {
      updateData.failedReason = event.failedReason;
    } else if (event.status !== "FAILED") {
      updateData.failedReason = null;
    }

    const updatedMessage = await prisma.message.update({
      where: {
        id: currentMessage.id,
      },
      data: updateData,
      select: {
        id: true,
        conversationId: true,
        status: true,
      },
    });

    await this.logWebhookEvent(channel.organizationId, event.channelType, "STATUS", event.rawPayload, 200);

    await realtimeService.broadcastMessageStatus(channel.organizationId, updatedMessage.id, updatedMessage.status);

    return true;
  }

  async processWebhook(
    source: WebhookSource,
    payload: unknown,
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Promise<WebhookProcessSummary> {
    this.verifySignature(source, rawBody, signatureHeader);

    const processor = this.resolveProcessor(source);
    const parsed = processor.parse(payload);

    let processedInbound = 0;
    let processedStatuses = 0;
    let skipped = 0;

    for (const inboundEvent of parsed.inboundMessages) {
      const processed = await this.processInboundEvent(inboundEvent);
      if (processed) {
        processedInbound += 1;
      } else {
        skipped += 1;
      }
    }

    for (const statusEvent of parsed.statusUpdates) {
      const processed = await this.processStatusUpdate(statusEvent);
      if (processed) {
        processedStatuses += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      processedInbound,
      processedStatuses,
      skipped,
    };
  }
}

export const webhookService = new WebhookService();

