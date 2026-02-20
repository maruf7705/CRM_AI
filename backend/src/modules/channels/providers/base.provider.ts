import type { ChannelType, ContentType, MessageStatus } from "@prisma/client";
import { createHmac, timingSafeEqual } from "node:crypto";
import { BadRequestError, AppError } from "../../../utils/errors";

export interface ProviderChannelContext {
  id: string;
  type: ChannelType;
  name: string;
  externalId?: string | null;
  credentials: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
}

export interface ProviderContactContext {
  id: string;
  displayName: string;
  phone?: string | null;
  facebookId?: string | null;
  instagramId?: string | null;
  whatsappId?: string | null;
}

export interface ProviderMessageContext {
  id: string;
  content: string;
  contentType: ContentType;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
}

export interface SendMessageInput {
  channel: ProviderChannelContext;
  contact: ProviderContactContext;
  conversationId: string;
  message: ProviderMessageContext;
}

export interface ProviderSendMessageResult {
  status: MessageStatus;
  externalMessageId?: string;
  rawResponse?: Record<string, unknown>;
}

export interface ProviderTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface ProviderConnectUrlInput {
  redirectUri: string;
  state: string;
}

export interface ProviderConnectUrlResult {
  authUrl: string;
  state: string;
}

export interface ProviderExchangeCodeInput {
  code: string;
  redirectUri: string;
  channelName?: string;
  externalId?: string;
}

export interface ProviderExchangeCodeResult {
  externalId: string;
  channelName: string;
  credentials: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export abstract class BaseProvider {
  abstract readonly type: ChannelType;

  async buildConnectUrl(_input: ProviderConnectUrlInput): Promise<ProviderConnectUrlResult> {
    throw new BadRequestError(`${this.type} does not support OAuth connect`);
  }

  async exchangeCode(_input: ProviderExchangeCodeInput): Promise<ProviderExchangeCodeResult> {
    throw new BadRequestError(`${this.type} does not support OAuth code exchange`);
  }

  abstract testConnection(channel: ProviderChannelContext): Promise<ProviderTestResult>;

  abstract sendMessage(input: SendMessageInput): Promise<ProviderSendMessageResult>;

  verifySignature(rawBody: Buffer, signatureHeader: string | undefined, signingSecret?: string): boolean {
    if (!signatureHeader || !signingSecret) {
      return false;
    }

    const headerParts = signatureHeader.split("=");
    if (headerParts.length !== 2) {
      return false;
    }

    const [algo, hash] = headerParts;
    if (!algo || !hash || (algo !== "sha256" && algo !== "sha1")) {
      return false;
    }

    const digest = createHmac(algo, signingSecret).update(rawBody).digest("hex");
    const expected = Buffer.from(digest, "hex");
    const actual = Buffer.from(hash, "hex");

    if (expected.length !== actual.length) {
      return false;
    }

    return timingSafeEqual(expected, actual);
  }

  protected requiredString(credentials: Record<string, unknown>, key: string): string {
    const value = credentials[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestError(`Missing required channel credential: ${key}`);
    }

    return value.trim();
  }

  protected optionalString(credentials: Record<string, unknown>, key: string): string | undefined {
    const value = credentials[key];
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  protected async requestJson<TResponse>(
    url: string,
    init: RequestInit & { context: string },
  ): Promise<TResponse> {
    const response = await fetch(url, init);
    const text = await response.text();

    let payload: unknown = {};
    if (text.length > 0) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = { raw: text };
      }
    }

    if (!response.ok) {
      throw new AppError(400, "PROVIDER_REQUEST_FAILED", `${init.context} failed`, {
        status: response.status,
        payload,
      });
    }

    return payload as TResponse;
  }
}

