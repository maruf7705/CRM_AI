export type ChannelType = "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "WEBCHAT" | "TELEGRAM" | "EMAIL";

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  isActive: boolean;
  externalId?: string;
  webhookSecret?: string;
  metadata?: Record<string, unknown>;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
  hasCredentials: boolean;
}

export interface ChannelDetail extends Channel {
  credentialsPreview?: Record<string, unknown>;
}
