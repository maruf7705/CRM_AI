export type MessageDirection = "INBOUND" | "OUTBOUND";
export type SenderType = "CONTACT" | "AGENT" | "AI" | "SYSTEM";
export type ContentType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "LOCATION" | "STICKER" | "TEMPLATE";
export type MessageStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export interface Message {
  id: string;
  externalId?: string;
  conversationId: string;
  content: string;
  direction: MessageDirection;
  contentType: ContentType;
  mediaUrl?: string;
  mediaMimeType?: string;
  sender: SenderType;
  status: MessageStatus;
  isAiGenerated: boolean;
  aiConfidence?: number;
  metadata?: Record<string, unknown>;
  deliveredAt?: string;
  readAt?: string;
  failedReason?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
