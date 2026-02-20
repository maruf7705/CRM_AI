import type { ChannelType, ContentType, MessageStatus } from "@prisma/client";

export interface NormalizedInboundMessage {
  channelType: ChannelType;
  channelExternalId: string;
  contactExternalId: string;
  contactName?: string;
  conversationExternalId?: string;
  messageExternalId?: string;
  content: string;
  contentType: ContentType;
  mediaUrl?: string;
  mediaMimeType?: string;
  occurredAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedMessageStatusUpdate {
  channelType: ChannelType;
  channelExternalId: string;
  messageExternalId: string;
  status: MessageStatus;
  deliveredAt?: Date;
  readAt?: Date;
  failedReason?: string;
  occurredAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface ParsedWebhookEvents {
  inboundMessages: NormalizedInboundMessage[];
  statusUpdates: NormalizedMessageStatusUpdate[];
}
