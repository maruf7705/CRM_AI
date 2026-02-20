import type { ChannelType, MessageStatus } from "@prisma/client";
import { env } from "../../../config/env";
import { BadRequestError } from "../../../utils/errors";
import type {
  ProviderChannelContext,
  ProviderConnectUrlInput,
  ProviderConnectUrlResult,
  ProviderExchangeCodeInput,
  ProviderExchangeCodeResult,
  ProviderSendMessageResult,
  ProviderTestResult,
  SendMessageInput,
} from "./base.provider";
import { BaseProvider } from "./base.provider";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const FB_OAUTH_BASE_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

interface FacebookTokenExchangeResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

interface FacebookPageAccount {
  id: string;
  name: string;
  access_token: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

interface FacebookAccountsResponse {
  data?: FacebookPageAccount[];
}

interface FacebookMessageResponse {
  message_id?: string;
  recipient_id?: string;
}

interface FacebookTestResponse {
  id?: string;
  name?: string;
}

export class FacebookProvider extends BaseProvider {
  readonly type: ChannelType = "FACEBOOK";

  async buildConnectUrl(input: ProviderConnectUrlInput): Promise<ProviderConnectUrlResult> {
    if (!env.FACEBOOK_APP_ID) {
      throw new BadRequestError("FACEBOOK_APP_ID is not configured");
    }

    const params = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      redirect_uri: input.redirectUri,
      state: input.state,
      response_type: "code",
      scope: [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_metadata",
        "pages_messaging",
        "business_management",
      ].join(","),
    });

    return {
      authUrl: `${FB_OAUTH_BASE_URL}?${params.toString()}`,
      state: input.state,
    };
  }

  async exchangeCode(input: ProviderExchangeCodeInput): Promise<ProviderExchangeCodeResult> {
    if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
      throw new BadRequestError("Facebook OAuth is not configured");
    }

    const tokenParams = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      client_secret: env.FACEBOOK_APP_SECRET,
      redirect_uri: input.redirectUri,
      code: input.code,
    });

    const tokenResponse = await this.requestJson<FacebookTokenExchangeResponse>(
      `${GRAPH_BASE_URL}/oauth/access_token?${tokenParams.toString()}`,
      {
        method: "GET",
        context: "Facebook OAuth token exchange",
      },
    );

    const userAccessToken = tokenResponse.access_token;
    if (!userAccessToken) {
      throw new BadRequestError("Facebook token exchange returned no access token");
    }

    const accountParams = new URLSearchParams({
      fields: "id,name,access_token,picture{url}",
      access_token: userAccessToken,
    });

    const accountsResponse = await this.requestJson<FacebookAccountsResponse>(
      `${GRAPH_BASE_URL}/me/accounts?${accountParams.toString()}`,
      {
        method: "GET",
        context: "Facebook page accounts lookup",
      },
    );

    const accounts = accountsResponse.data ?? [];
    if (accounts.length === 0) {
      throw new BadRequestError("No Facebook pages available for this account");
    }

    const selectedAccount = input.externalId
      ? accounts.find((account) => account.id === input.externalId)
      : accounts[0];

    if (!selectedAccount) {
      throw new BadRequestError("Requested Facebook page was not found in OAuth response");
    }

    return {
      externalId: selectedAccount.id,
      channelName: input.channelName?.trim() || selectedAccount.name || "Facebook Messenger",
      credentials: {
        pageAccessToken: selectedAccount.access_token,
        pageId: selectedAccount.id,
        appId: env.FACEBOOK_APP_ID,
      },
      metadata: {
        pageName: selectedAccount.name,
        pictureUrl: selectedAccount.picture?.data?.url,
        userTokenExpiresIn: tokenResponse.expires_in,
      },
    };
  }

  async testConnection(channel: ProviderChannelContext): Promise<ProviderTestResult> {
    const token =
      this.optionalString(channel.credentials, "pageAccessToken") ??
      this.optionalString(channel.credentials, "accessToken");

    if (!token) {
      return {
        success: false,
        message: "Missing Facebook page access token",
      };
    }

    const pageId =
      channel.externalId?.trim() ||
      this.optionalString(channel.credentials, "pageId") ||
      "me";

    const params = new URLSearchParams({
      fields: "id,name",
      access_token: token,
    });

    const response = await this.requestJson<FacebookTestResponse>(
      `${GRAPH_BASE_URL}/${pageId}?${params.toString()}`,
      {
        method: "GET",
        context: "Facebook connection test",
      },
    );

    return {
      success: true,
      message: `Connected to ${response.name ?? "Facebook page"}`,
      details: {
        pageId: response.id ?? pageId,
        name: response.name,
      },
    };
  }

  async sendMessage(input: SendMessageInput): Promise<ProviderSendMessageResult> {
    const token =
      this.optionalString(input.channel.credentials, "pageAccessToken") ??
      this.optionalString(input.channel.credentials, "accessToken");

    if (!token) {
      throw new BadRequestError("Facebook channel is missing page access token");
    }

    const recipientId = input.contact.facebookId?.trim();
    if (!recipientId) {
      throw new BadRequestError("Conversation contact does not have a Facebook recipient id");
    }

    const body = {
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text: input.message.content },
    };

    const response = await this.requestJson<FacebookMessageResponse>(
      `${GRAPH_BASE_URL}/me/messages?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        context: "Facebook send message",
      },
    );

    const result: ProviderSendMessageResult = {
      status: "SENT" satisfies MessageStatus,
      rawResponse: response as Record<string, unknown>,
    };

    if (response.message_id) {
      result.externalMessageId = response.message_id;
    }

    return result;
  }
}

