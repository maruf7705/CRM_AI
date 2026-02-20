import type { ChannelType, MessageStatus } from "@prisma/client";
import { env } from "../../../config/env";
import { BadRequestError } from "../../../utils/errors";
import type {
  ProviderChannelContext,
  ProviderSendMessageResult,
  ProviderTestResult,
  SendMessageInput,
} from "./base.provider";
import { BaseProvider } from "./base.provider";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

interface WhatsAppTestResponse {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
}

interface WhatsAppSendResponse {
  messages?: Array<{ id?: string }>;
}

export class WhatsappProvider extends BaseProvider {
  readonly type: ChannelType = "WHATSAPP";

  private resolveAccessToken(channel: ProviderChannelContext): string {
    const channelToken =
      this.optionalString(channel.credentials, "accessToken") ??
      this.optionalString(channel.credentials, "whatsappAccessToken");

    const token = channelToken ?? env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
      throw new BadRequestError("WhatsApp access token is not configured");
    }

    return token;
  }

  private resolvePhoneNumberId(channel: ProviderChannelContext): string {
    const fromCredentials =
      this.optionalString(channel.credentials, "phoneNumberId") ??
      this.optionalString(channel.credentials, "whatsappPhoneNumberId");

    const phoneNumberId = channel.externalId?.trim() || fromCredentials || env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      throw new BadRequestError("WhatsApp phone number id is not configured");
    }

    return phoneNumberId;
  }

  async testConnection(channel: ProviderChannelContext): Promise<ProviderTestResult> {
    const accessToken = this.resolveAccessToken(channel);
    const phoneNumberId = this.resolvePhoneNumberId(channel);

    const params = new URLSearchParams({
      fields: "id,display_phone_number,verified_name",
    });

    const response = await this.requestJson<WhatsAppTestResponse>(
      `${GRAPH_BASE_URL}/${phoneNumberId}?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        context: "WhatsApp connection test",
      },
    );

    return {
      success: true,
      message: `Connected WhatsApp number ${response.display_phone_number ?? phoneNumberId}`,
      details: {
        phoneNumberId: response.id ?? phoneNumberId,
        displayPhoneNumber: response.display_phone_number,
        verifiedName: response.verified_name,
      },
    };
  }

  async sendMessage(input: SendMessageInput): Promise<ProviderSendMessageResult> {
    const accessToken = this.resolveAccessToken(input.channel);
    const phoneNumberId = this.resolvePhoneNumberId(input.channel);

    const recipient = input.contact.whatsappId?.trim() || input.contact.phone?.trim();
    if (!recipient) {
      throw new BadRequestError("Conversation contact does not have a WhatsApp recipient id");
    }

    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        body: input.message.content,
      },
    };

    const response = await this.requestJson<WhatsAppSendResponse>(
      `${GRAPH_BASE_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        context: "WhatsApp send message",
      },
    );

    const result: ProviderSendMessageResult = {
      status: "SENT" satisfies MessageStatus,
      rawResponse: response as Record<string, unknown>,
    };

    const externalMessageId = response.messages?.[0]?.id;
    if (externalMessageId) {
      result.externalMessageId = externalMessageId;
    }

    return result;
  }
}

