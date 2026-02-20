import type { ContentType } from "@prisma/client";
import type { ParsedWebhookEvents } from "./types";

interface FacebookAttachment {
  type?: string;
  payload?: {
    url?: string;
  };
}

interface FacebookMessageEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: FacebookAttachment[];
  };
  delivery?: {
    mids?: string[];
    watermark?: number;
  };
  read?: {
    mid?: string;
    watermark?: number;
  };
}

const mapAttachmentType = (attachmentType: string | undefined): ContentType => {
  switch (attachmentType) {
    case "image":
      return "IMAGE";
    case "video":
      return "VIDEO";
    case "audio":
      return "AUDIO";
    default:
      return "FILE";
  }
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export class FacebookProcessor {
  parse(payload: unknown): ParsedWebhookEvents {
    const inboundMessages: ParsedWebhookEvents["inboundMessages"] = [];
    const statusUpdates: ParsedWebhookEvents["statusUpdates"] = [];
    const root = toRecord(payload);
    const entries = Array.isArray(root.entry) ? root.entry : [];

    entries.forEach((entry) => {
      const entryRecord = toRecord(entry);
      const entryPageId = typeof entryRecord.id === "string" ? entryRecord.id : undefined;
      const messaging = Array.isArray(entryRecord.messaging) ? entryRecord.messaging : [];

      messaging.forEach((event) => {
        const eventRecord = event as FacebookMessageEvent;
        const senderId = eventRecord.sender?.id;
        const recipientId = eventRecord.recipient?.id;
        const channelExternalId = recipientId ?? entryPageId;

        if (!senderId || !channelExternalId) {
          return;
        }

        const timestampMs = typeof eventRecord.timestamp === "number" ? eventRecord.timestamp : Date.now();
        const message = eventRecord.message;

        if (message && !message.is_echo) {
          const firstAttachment = message.attachments?.[0];
          const contentType = message.text ? "TEXT" : mapAttachmentType(firstAttachment?.type);
          const textContent = message.text?.trim();
          const fallbackContent = firstAttachment ? "[Attachment]" : "";
          const content = textContent && textContent.length > 0 ? textContent : fallbackContent;

          if (!content) {
            return;
          }

          const inboundEvent: ParsedWebhookEvents["inboundMessages"][number] = {
            channelType: "FACEBOOK",
            channelExternalId,
            contactExternalId: senderId,
            content,
            contentType,
            occurredAt: new Date(timestampMs),
            rawPayload: toRecord(eventRecord),
          };

          if (message.mid) {
            inboundEvent.messageExternalId = message.mid;
          }

          if (firstAttachment?.payload?.url) {
            inboundEvent.mediaUrl = firstAttachment.payload.url;
          }

          inboundMessages.push(inboundEvent);
        }

        if (eventRecord.delivery?.mids && eventRecord.delivery.mids.length > 0) {
          eventRecord.delivery.mids.forEach((messageExternalId) => {
            if (!messageExternalId) {
              return;
            }

            statusUpdates.push({
              channelType: "FACEBOOK",
              channelExternalId,
              messageExternalId,
              status: "DELIVERED",
              deliveredAt: new Date(timestampMs),
              occurredAt: new Date(timestampMs),
              rawPayload: toRecord(eventRecord),
            });
          });
        }

        if (eventRecord.read?.mid) {
          statusUpdates.push({
            channelType: "FACEBOOK",
            channelExternalId,
            messageExternalId: eventRecord.read.mid,
            status: "READ",
            readAt: new Date(timestampMs),
            occurredAt: new Date(timestampMs),
            rawPayload: toRecord(eventRecord),
          });
        }
      });
    });

    return {
      inboundMessages,
      statusUpdates,
    };
  }
}

