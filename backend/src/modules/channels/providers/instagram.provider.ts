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
const IG_OAUTH_BASE_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

interface InstagramTokenExchangeResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

interface InstagramLinkedAccount {
  id: string;
  username?: string;
  profile_picture_url?: string;
}

interface InstagramPageAccount {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: InstagramLinkedAccount;
}

interface InstagramAccountsResponse {
  data?: InstagramPageAccount[];
}

interface InstagramMessageResponse {
  message_id?: string;
}

interface InstagramTestResponse {
  id?: string;
  username?: string;
}

export class InstagramProvider extends BaseProvider {
  readonly type: ChannelType = "INSTAGRAM";

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
        "instagram_basic",
        "instagram_manage_messages",
        "pages_show_list",
        "pages_manage_metadata",
        "business_management",
      ].join(","),
    });

    return {
      authUrl: `${IG_OAUTH_BASE_URL}?${params.toString()}`,
      state: input.state,
    };
  }

  async exchangeCode(input: ProviderExchangeCodeInput): Promise<ProviderExchangeCodeResult> {
    if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
      throw new BadRequestError("Instagram OAuth is not configured");
    }

    const tokenParams = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      client_secret: env.FACEBOOK_APP_SECRET,
      redirect_uri: input.redirectUri,
      code: input.code,
    });

    const tokenResponse = await this.requestJson<InstagramTokenExchangeResponse>(
      `${GRAPH_BASE_URL}/oauth/access_token?${tokenParams.toString()}`,
      {
        method: "GET",
        context: "Instagram OAuth token exchange",
      },
    );

    const userAccessToken = tokenResponse.access_token;
    if (!userAccessToken) {
      throw new BadRequestError("Instagram token exchange returned no access token");
    }

    const accountParams = new URLSearchParams({
      fields: "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
      access_token: userAccessToken,
    });

    const accountsResponse = await this.requestJson<InstagramAccountsResponse>(
      `${GRAPH_BASE_URL}/me/accounts?${accountParams.toString()}`,
      {
        method: "GET",
        context: "Instagram business account lookup",
      },
    );

    const linkedAccounts = (accountsResponse.data ?? [])
      .filter((pageAccount) => pageAccount.instagram_business_account?.id)
      .map((pageAccount) => ({
        pageId: pageAccount.id,
        pageName: pageAccount.name,
        pageAccessToken: pageAccount.access_token,
        instagram: pageAccount.instagram_business_account as InstagramLinkedAccount,
      }));

    if (linkedAccounts.length === 0) {
      throw new BadRequestError("No connected Instagram business account found");
    }

    const selectedAccount = input.externalId
      ? linkedAccounts.find((account) => account.instagram.id === input.externalId)
      : linkedAccounts[0];

    if (!selectedAccount) {
      throw new BadRequestError("Requested Instagram account not found in OAuth response");
    }

    return {
      externalId: selectedAccount.instagram.id,
      channelName:
        input.channelName?.trim() ||
        (selectedAccount.instagram.username ? `@${selectedAccount.instagram.username}` : "Instagram DM"),
      credentials: {
        pageAccessToken: selectedAccount.pageAccessToken,
        instagramBusinessAccountId: selectedAccount.instagram.id,
        pageId: selectedAccount.pageId,
        appId: env.FACEBOOK_APP_ID,
      },
      metadata: {
        pageId: selectedAccount.pageId,
        pageName: selectedAccount.pageName,
        username: selectedAccount.instagram.username,
        profilePictureUrl: selectedAccount.instagram.profile_picture_url,
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
        message: "Missing Instagram page access token",
      };
    }

    const instagramBusinessAccountId =
      channel.externalId?.trim() ||
      this.optionalString(channel.credentials, "instagramBusinessAccountId");

    if (!instagramBusinessAccountId) {
      return {
        success: false,
        message: "Missing Instagram business account id",
      };
    }

    const params = new URLSearchParams({
      fields: "id,username",
      access_token: token,
    });

    const response = await this.requestJson<InstagramTestResponse>(
      `${GRAPH_BASE_URL}/${instagramBusinessAccountId}?${params.toString()}`,
      {
        method: "GET",
        context: "Instagram connection test",
      },
    );

    return {
      success: true,
      message: `Connected to Instagram account ${response.username ? `@${response.username}` : response.id ?? ""}`.trim(),
      details: {
        instagramBusinessAccountId: response.id ?? instagramBusinessAccountId,
        username: response.username,
      },
    };
  }

  async sendMessage(input: SendMessageInput): Promise<ProviderSendMessageResult> {
    const token =
      this.optionalString(input.channel.credentials, "pageAccessToken") ??
      this.optionalString(input.channel.credentials, "accessToken");

    if (!token) {
      throw new BadRequestError("Instagram channel is missing page access token");
    }

    const instagramBusinessAccountId =
      input.channel.externalId?.trim() ??
      this.optionalString(input.channel.credentials, "instagramBusinessAccountId");

    if (!instagramBusinessAccountId) {
      throw new BadRequestError("Instagram channel is missing business account id");
    }

    const recipientId = input.contact.instagramId?.trim();
    if (!recipientId) {
      throw new BadRequestError("Conversation contact does not have an Instagram recipient id");
    }

    const body = {
      recipient: { id: recipientId },
      message: { text: input.message.content },
    };

    const response = await this.requestJson<InstagramMessageResponse>(
      `${GRAPH_BASE_URL}/${instagramBusinessAccountId}/messages?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        context: "Instagram send message",
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

