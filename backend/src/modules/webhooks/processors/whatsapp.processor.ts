import type { ContentType, MessageStatus } from "@prisma/client";
import type { ParsedWebhookEvents } from "./types";

interface WhatsAppMessagePayload {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string };
  video?: { id?: string; mime_type?: string };
  audio?: { id?: string; mime_type?: string };
  document?: { id?: string; mime_type?: string };
  sticker?: { id?: string; mime_type?: string };
}

interface WhatsAppStatusPayload {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{ title?: string; message?: string }>;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toTimestampDate = (value: string | undefined): Date => {
  if (!value) {
    return new Date();
  }

  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) {
    if (value.length <= 10) {
      return new Date(asNumber * 1000);
    }

    return new Date(asNumber);
  }

  return new Date(value);
};

const mapMessageType = (type: string | undefined): ContentType => {
  switch (type) {
    case "image":
      return "IMAGE";
    case "video":
      return "VIDEO";
    case "audio":
      return "AUDIO";
    case "sticker":
      return "STICKER";
    case "document":
      return "FILE";
    default:
      return "TEXT";
  }
};

const mapStatus = (status: string | undefined): MessageStatus => {
  switch (status) {
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    case "failed":
      return "FAILED";
    case "sent":
      return "SENT";
    default:
      return "PENDING";
  }
};

const resolveMessageContent = (message: WhatsAppMessagePayload): string => {
  if (message.text?.body) {
    return message.text.body.trim();
  }

  switch (message.type) {
    case "image":
      return "[Image]";
    case "video":
      return "[Video]";
    case "audio":
      return "[Audio]";
    case "document":
      return "[Document]";
    case "sticker":
      return "[Sticker]";
    default:
      return "[Unsupported message]";
  }
};

export class WhatsappProcessor {
  parse(payload: unknown): ParsedWebhookEvents {
    const inboundMessages: ParsedWebhookEvents["inboundMessages"] = [];
    const statusUpdates: ParsedWebhookEvents["statusUpdates"] = [];

    const root = toRecord(payload);
    const entries = Array.isArray(root.entry) ? root.entry : [];

    entries.forEach((entry) => {
      const entryRecord = toRecord(entry);
      const changes = Array.isArray(entryRecord.changes) ? entryRecord.changes : [];

      changes.forEach((change) => {
        const changeRecord = toRecord(change);
        const value = toRecord(changeRecord.value);
        const metadata = toRecord(value.metadata);
        const channelExternalId =
          typeof metadata.phone_number_id === "string" ? metadata.phone_number_id : undefined;

        if (!channelExternalId) {
          return;
        }

        const contacts = Array.isArray(value.contacts) ? value.contacts : [];
        const messages = Array.isArray(value.messages) ? value.messages : [];
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];

        messages.forEach((messageItem) => {
          const message = messageItem as WhatsAppMessagePayload;
          if (!message.from) {
            return;
          }

          const contactMeta = contacts
            .map((contact) => toRecord(contact))
            .find((contact) => contact.wa_id === message.from);

          const profile = contactMeta ? toRecord(contactMeta.profile) : {};
          const contactName = typeof profile.name === "string" ? profile.name : undefined;
          const occurredAt = toTimestampDate(message.timestamp);
          const content = resolveMessageContent(message);
          const contentType = mapMessageType(message.type);

          const inboundEvent: ParsedWebhookEvents["inboundMessages"][number] = {
            channelType: "WHATSAPP",
            channelExternalId,
            contactExternalId: message.from,
            content,
            contentType,
            occurredAt,
            rawPayload: toRecord(messageItem),
          };

          if (contactName) {
            inboundEvent.contactName = contactName;
          }

          if (message.id) {
            inboundEvent.messageExternalId = message.id;
          }

          const mediaMimeType =
            message.image?.mime_type ??
            message.video?.mime_type ??
            message.audio?.mime_type ??
            message.document?.mime_type ??
            message.sticker?.mime_type;

          if (mediaMimeType) {
            inboundEvent.mediaMimeType = mediaMimeType;
          }

          inboundMessages.push(inboundEvent);
        });

        statuses.forEach((statusItem) => {
          const status = statusItem as WhatsAppStatusPayload;
          if (!status.id) {
            return;
          }

          const occurredAt = toTimestampDate(status.timestamp);
          const mappedStatus = mapStatus(status.status);
          const firstError = status.errors?.[0];

          const statusEvent: ParsedWebhookEvents["statusUpdates"][number] = {
            channelType: "WHATSAPP",
            channelExternalId,
            messageExternalId: status.id,
            status: mappedStatus,
            occurredAt,
            rawPayload: toRecord(statusItem),
          };

          if (mappedStatus === "DELIVERED") {
            statusEvent.deliveredAt = occurredAt;
          }

          if (mappedStatus === "READ") {
            statusEvent.readAt = occurredAt;
          }

          if (mappedStatus === "FAILED") {
            statusEvent.failedReason = firstError?.message ?? firstError?.title ?? "Provider failure";
          }

          statusUpdates.push(statusEvent);
        });
      });
    });

    return {
      inboundMessages,
      statusUpdates,
    };
  }
}

