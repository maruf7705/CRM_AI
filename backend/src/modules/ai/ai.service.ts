import type { Prisma, Role } from "@prisma/client";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { supabaseAdmin } from "../../config/supabase-admin";
import { decryptJson } from "../../utils/encryption";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { sanitizeText } from "../../utils/helpers";
import { getProviderForChannelType } from "../channels/providers/provider-registry";
import { realtimeService } from "../realtime/realtime.service";
import { n8nClient } from "./n8n.client";
import { openaiClient } from "./openai.client";
import type {
  AiTestInput,
  CreateTrainingDocBodyInput,
  UpdateAiSettingsInput,
} from "./ai.validators";

const TRAINING_BUCKET = "ai-training";
let trainingBucketReady = false;

interface MembershipContext {
  role: Role;
}

interface ConversationContext {
  id: string;
  aiEnabled: boolean;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  organization: {
    id: string;
    name: string;
    aiEnabled: boolean;
    aiMode: "OFF" | "SUGGESTION" | "AUTO_REPLY";
    aiSystemPrompt: string | null;
    aiModel: string;
    aiTemperature: number;
    aiMaxTokens: number;
    n8nWebhookUrl: string | null;
  };
  contact: {
    id: string;
    displayName: string;
    phone: string | null;
    facebookId: string | null;
    instagramId: string | null;
    whatsappId: string | null;
  };
  channel: {
    id: string;
    type: "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "WEBCHAT" | "TELEGRAM" | "EMAIL";
    name: string;
    externalId: string | null;
    credentials: string;
    metadata: Prisma.JsonValue;
  };
}

interface TrainingDocResponse {
  id: string;
  title: string;
  content: string;
  fileUrl?: string;
  fileType?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AiSettingsResponse {
  aiEnabled: boolean;
  aiMode: "OFF" | "SUGGESTION" | "AUTO_REPLY";
  aiSystemPrompt: string;
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  n8nWebhookUrl?: string;
}

interface CreateTrainingDocFileInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  size: number;
}

interface TriggerInboundAiInput {
  organizationId: string;
  conversationId: string;
  inboundMessageId: string;
}

interface TriggerAiReplyInput {
  organizationId: string;
  conversationId: string;
  requestedByUserId?: string;
  force?: boolean;
}

interface N8nCallbackPayload {
  organizationId?: string;
  conversationId?: string;
  aiResponse?: string;
  confidence?: number;
  tokensUsed?: number;
  model?: string;
  error?: string;
}

interface BuildAiContextResult {
  conversation: ConversationContext;
  trainingContext: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  latestUserMessage: string;
}

const ADMIN_ROLES: readonly Role[] = ["OWNER", "ADMIN"];
const AI_INFERENCE_MAX_HISTORY_MESSAGES = 20;

const hasAdminRole = (role: Role): boolean => ADMIN_ROLES.includes(role);

const sanitizeMultilineText = (value: string): string =>
  value
    .replace(/<script.*?>.*?<\/script>/gis, "")
    .replace(/\u0000/g, "")
    .trim();

const trimContext = (value: string, maxChars: number): string =>
  value.length <= maxChars ? value : value.slice(0, maxChars);

const toTrainingDocResponse = (doc: {
  id: string;
  title: string;
  content: string;
  fileUrl: string | null;
  fileType: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TrainingDocResponse => {
  const payload: TrainingDocResponse = {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (doc.fileUrl) {
    payload.fileUrl = doc.fileUrl;
  }

  if (doc.fileType) {
    payload.fileType = doc.fileType;
  }

  return payload;
};

const toAiSettingsResponse = (org: {
  aiEnabled: boolean;
  aiMode: "OFF" | "SUGGESTION" | "AUTO_REPLY";
  aiSystemPrompt: string | null;
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  n8nWebhookUrl: string | null;
}): AiSettingsResponse => {
  const payload: AiSettingsResponse = {
    aiEnabled: org.aiEnabled,
    aiMode: org.aiMode,
    aiSystemPrompt: org.aiSystemPrompt ?? "",
    aiModel: org.aiModel,
    aiTemperature: org.aiTemperature,
    aiMaxTokens: org.aiMaxTokens,
  };

  if (org.n8nWebhookUrl) {
    payload.n8nWebhookUrl = org.n8nWebhookUrl;
  }

  return payload;
};

const resolveBackendBaseUrl = (): string => {
  const configured = process.env.BACKEND_URL;
  if (configured) {
    return configured;
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railwayDomain) {
    return `https://${railwayDomain}`;
  }

  return `http://localhost:${process.env.PORT ?? "4000"}`;
};

export class AiService {
  private async requireMembership(userId: string, orgId: string): Promise<MembershipContext> {
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenError("You do not have access to this organization");
    }

    return membership;
  }

  private async requireAdminMembership(userId: string, orgId: string): Promise<void> {
    const membership = await this.requireMembership(userId, orgId);
    if (!hasAdminRole(membership.role)) {
      throw new ForbiddenError("Only admins and owners can manage AI settings");
    }
  }

  private async ensureTrainingBucket(): Promise<void> {
    if (trainingBucketReady) {
      return;
    }

    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) {
      throw new BadRequestError("Unable to verify AI training storage bucket", error.message);
    }

    const hasBucket = buckets.some((bucket) => bucket.name === TRAINING_BUCKET);
    if (!hasBucket) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(TRAINING_BUCKET, {
        public: true,
        fileSizeLimit: 15 * 1024 * 1024,
      });

      if (createError) {
        throw new BadRequestError("Unable to create AI training storage bucket", createError.message);
      }
    }

    trainingBucketReady = true;
  }

  private async getConversationContext(organizationId: string, conversationId: string): Promise<ConversationContext> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId,
      },
      select: {
        id: true,
        aiEnabled: true,
        status: true,
        organization: {
          select: {
            id: true,
            name: true,
            aiEnabled: true,
            aiMode: true,
            aiSystemPrompt: true,
            aiModel: true,
            aiTemperature: true,
            aiMaxTokens: true,
            n8nWebhookUrl: true,
          },
        },
        contact: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            facebookId: true,
            instagramId: true,
            whatsappId: true,
          },
        },
        channel: {
          select: {
            id: true,
            type: true,
            name: true,
            externalId: true,
            credentials: true,
            metadata: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation");
    }

    return conversation;
  }

  private async buildTrainingContext(organizationId: string): Promise<string> {
    const docs = await prisma.aiTrainingDoc.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
      select: {
        title: true,
        content: true,
      },
    });

    if (docs.length === 0) {
      return "";
    }

    const joined = docs
      .map((doc) => `# ${doc.title}\n${trimContext(doc.content, 2500)}`)
      .join("\n\n");

    return trimContext(joined, 14000);
  }

  private async buildConversationHistory(conversationId: string): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: AI_INFERENCE_MAX_HISTORY_MESSAGES,
      select: {
        content: true,
        sender: true,
      },
    });

    return messages
      .reverse()
      .map((message) => ({
        role: message.sender === "CONTACT" ? ("user" as const) : ("assistant" as const),
        content: trimContext(message.content, 2000),
      }));
  }

  private async buildAiContext(
    organizationId: string,
    conversationId: string,
    latestUserMessage?: string,
  ): Promise<BuildAiContextResult> {
    const [conversation, trainingContext, conversationHistory] = await Promise.all([
      this.getConversationContext(organizationId, conversationId),
      this.buildTrainingContext(organizationId),
      this.buildConversationHistory(conversationId),
    ]);

    const fallbackLatestUserMessage =
      conversationHistory
        .slice()
        .reverse()
        .find((message) => message.role === "user")?.content ?? "Hello";

    return {
      conversation,
      trainingContext,
      conversationHistory,
      latestUserMessage: latestUserMessage ? trimContext(latestUserMessage, 4000) : fallbackLatestUserMessage,
    };
  }

  private async setConversationAiHandling(
    organizationId: string,
    conversationId: string,
    isAiHandling: boolean,
  ): Promise<void> {
    const updated = await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        isAiHandling,
      },
      select: {
        updatedAt: true,
      },
    });

    await realtimeService.broadcastConversationUpdate(organizationId, conversationId, {
      isAiHandling,
      updatedAt: updated.updatedAt.toISOString(),
    });
  }

  private async broadcastAiError(organizationId: string, conversationId: string, error: string): Promise<void> {
    await realtimeService.broadcastAiError(organizationId, conversationId, error);
    await this.setConversationAiHandling(organizationId, conversationId, false);
  }

  private async dispatchAiReply(params: {
    context: BuildAiContextResult;
    aiResponse: string;
    confidence?: number;
    tokensUsed?: number;
    model?: string;
  }): Promise<{ delivered: boolean; messageId: string }> {
    const { context, aiResponse, confidence, tokensUsed, model } = params;
    const content = sanitizeMultilineText(aiResponse);
    if (!content) {
      throw new BadRequestError("AI response is empty");
    }

    const preview = trimContext(content, 100);
    const now = new Date();

    const createdMessage = await prisma.message.create({
      data: {
        conversationId: context.conversation.id,
        direction: "OUTBOUND",
        sender: "AI",
        content,
        contentType: "TEXT",
        status: "PENDING",
        isAiGenerated: true,
        aiConfidence: confidence ?? null,
        metadata: {
          source: "ai",
          model: model ?? context.conversation.organization.aiModel,
          tokensUsed: tokensUsed ?? null,
        } as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        conversationId: true,
        direction: true,
        sender: true,
        content: true,
        status: true,
        isAiGenerated: true,
        aiConfidence: true,
        createdAt: true,
      },
    });

    const supportsProviderDispatch =
      context.conversation.channel.type === "FACEBOOK" ||
      context.conversation.channel.type === "INSTAGRAM" ||
      context.conversation.channel.type === "WHATSAPP";

    let delivered = true;
    let finalStatus: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" = "SENT";
    let failedReason: string | null = null;
    let externalMessageId: string | null = null;
    let providerResponse: Record<string, unknown> | null = null;

    if (supportsProviderDispatch) {
      try {
        const provider = getProviderForChannelType(context.conversation.channel.type);
        const credentials = decryptJson<Record<string, unknown>>(context.conversation.channel.credentials);
        const sendResult = await provider.sendMessage({
          conversationId: context.conversation.id,
          channel: {
            id: context.conversation.channel.id,
            type: context.conversation.channel.type,
            name: context.conversation.channel.name,
            externalId: context.conversation.channel.externalId,
            credentials,
            metadata:
              context.conversation.channel.metadata && typeof context.conversation.channel.metadata === "object"
                ? (context.conversation.channel.metadata as Record<string, unknown>)
                : null,
          },
          contact: context.conversation.contact,
          message: {
            id: createdMessage.id,
            content,
            contentType: "TEXT",
          },
        });

        finalStatus = sendResult.status;
        if (sendResult.externalMessageId) {
          externalMessageId = sendResult.externalMessageId;
        }
        if (sendResult.rawResponse) {
          providerResponse = sendResult.rawResponse;
        }
      } catch (error) {
        delivered = false;
        finalStatus = "FAILED";
        failedReason = error instanceof Error ? error.message.slice(0, 500) : "AI provider dispatch failed";
      }
    }

    const updatedConversation = await prisma.$transaction(async (tx) => {
      const messageUpdate: Prisma.MessageUpdateInput = {
        status: finalStatus,
        failedReason,
      };

      if (externalMessageId) {
        messageUpdate.externalId = externalMessageId;
      }

      if (providerResponse) {
        messageUpdate.metadata = {
          source: "ai",
          model: model ?? context.conversation.organization.aiModel,
          tokensUsed: tokensUsed ?? null,
          providerResponse,
        } as Prisma.InputJsonValue;
      }

      await tx.message.update({
        where: { id: createdMessage.id },
        data: messageUpdate,
      });

      const conversation = await tx.conversation.update({
        where: {
          id: context.conversation.id,
        },
        data: {
          lastMessageAt: now,
          lastMessagePreview: preview,
          unreadCount: 0,
          isAiHandling: false,
        },
        select: {
          id: true,
          unreadCount: true,
          lastMessageAt: true,
          lastMessagePreview: true,
          aiEnabled: true,
          isAiHandling: true,
          updatedAt: true,
        },
      });

      await tx.analyticsEvent.create({
        data: {
          organizationId: context.conversation.organization.id,
          type: delivered ? "ai_reply_sent" : "ai_reply_failed",
          channel: context.conversation.channel.type,
          data: {
            conversationId: context.conversation.id,
            messageId: createdMessage.id,
            model: model ?? context.conversation.organization.aiModel,
            tokensUsed: tokensUsed ?? null,
            failedReason,
          },
        },
      });

      return conversation;
    });

    const realtimeMessagePayload: Record<string, unknown> = {
      id: createdMessage.id,
      conversationId: createdMessage.conversationId,
      direction: createdMessage.direction,
      sender: createdMessage.sender,
      content: createdMessage.content,
      status: finalStatus,
      isAiGenerated: true,
      createdAt: createdMessage.createdAt.toISOString(),
    };

    if (typeof confidence === "number") {
      realtimeMessagePayload.aiConfidence = confidence;
    }

    await Promise.all([
      realtimeService.broadcastNewMessage(context.conversation.organization.id, realtimeMessagePayload, {
        id: updatedConversation.id,
        unreadCount: updatedConversation.unreadCount,
        lastMessageAt: updatedConversation.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: updatedConversation.lastMessagePreview ?? null,
        aiEnabled: updatedConversation.aiEnabled,
        isAiHandling: updatedConversation.isAiHandling,
        updatedAt: updatedConversation.updatedAt.toISOString(),
      }),
      realtimeService.broadcastMessageStatus(context.conversation.organization.id, createdMessage.id, finalStatus),
      realtimeService.broadcastConversationUpdate(context.conversation.organization.id, context.conversation.id, {
        lastMessageAt: updatedConversation.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: updatedConversation.lastMessagePreview ?? null,
        unreadCount: updatedConversation.unreadCount,
        isAiHandling: updatedConversation.isAiHandling,
        updatedAt: updatedConversation.updatedAt.toISOString(),
      }),
      realtimeService.broadcastUnreadUpdate(
        context.conversation.organization.id,
        context.conversation.id,
        updatedConversation.unreadCount,
      ),
      ...(delivered
        ? [
            realtimeService.broadcastAiReply(context.conversation.organization.id, context.conversation.id, {
              id: createdMessage.id,
              content: content,
              status: finalStatus,
            }),
          ]
        : [
            realtimeService.broadcastAiError(
              context.conversation.organization.id,
              context.conversation.id,
              failedReason ?? "AI reply dispatch failed",
            ),
          ]),
    ]);

    return {
      delivered,
      messageId: createdMessage.id,
    };
  }

  private async generateSuggestion(context: BuildAiContextResult): Promise<string> {
    const completion = await openaiClient.generateReply({
      systemPrompt:
        context.conversation.organization.aiSystemPrompt ??
        "You are an expert customer support assistant. Produce concise, helpful responses.",
      model: context.conversation.organization.aiModel,
      temperature: context.conversation.organization.aiTemperature,
      maxTokens: context.conversation.organization.aiMaxTokens,
      trainingContext: context.trainingContext,
      conversationHistory: context.conversationHistory,
      latestUserMessage: context.latestUserMessage,
    });

    return completion.content;
  }

  private async enqueueOrGenerateAutoReply(
    context: BuildAiContextResult,
  ): Promise<{ queued: boolean; message: string }> {
    const org = context.conversation.organization;
    const callbackUrl = `${resolveBackendBaseUrl()}/api/v1/webhooks/n8n-callback`;

    const n8nPayload: {
      organizationId: string;
      conversationId: string;
      contactName: string;
      channelType: string;
      incomingMessage: string;
      conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
      systemPrompt: string;
      model: string;
      temperature: number;
      callbackUrl: string;
      trainingContext?: string;
      callbackSecret?: string;
    } = {
      organizationId: org.id,
      conversationId: context.conversation.id,
      contactName: context.conversation.contact.displayName,
      channelType: context.conversation.channel.type,
      incomingMessage: context.latestUserMessage,
      conversationHistory: context.conversationHistory,
      systemPrompt:
        org.aiSystemPrompt ??
        "You are an expert customer support assistant. Provide clear and concise responses.",
      model: org.aiModel,
      temperature: org.aiTemperature,
      callbackUrl,
    };

    if (context.trainingContext) {
      n8nPayload.trainingContext = context.trainingContext;
    }

    const callbackSecret = process.env.N8N_CALLBACK_SECRET;
    if (callbackSecret) {
      n8nPayload.callbackSecret = callbackSecret;
    }

    let n8nAccepted = false;
    try {
      const n8nQueueResult = await n8nClient.enqueueReply(n8nPayload, { webhookUrl: org.n8nWebhookUrl });
      n8nAccepted = n8nQueueResult.accepted;
    } catch (error) {
      logger.warn("n8n enqueue failed, falling back to direct OpenAI reply", {
        organizationId: org.id,
        conversationId: context.conversation.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (n8nAccepted) {
      return {
        queued: true,
        message: "AI reply queued via n8n",
      };
    }

    const completion = await openaiClient.generateReply({
      systemPrompt:
        org.aiSystemPrompt ??
        "You are an expert customer support assistant. Provide clear and concise responses.",
      model: org.aiModel,
      temperature: org.aiTemperature,
      maxTokens: org.aiMaxTokens,
      trainingContext: context.trainingContext,
      conversationHistory: context.conversationHistory,
      latestUserMessage: context.latestUserMessage,
    });

    const dispatchPayload: {
      context: BuildAiContextResult;
      aiResponse: string;
      confidence?: number;
      tokensUsed?: number;
      model?: string;
    } = {
      context,
      aiResponse: completion.content,
      model: completion.model,
    };

    if (typeof completion.confidence === "number") {
      dispatchPayload.confidence = completion.confidence;
    }

    if (typeof completion.tokensUsed === "number") {
      dispatchPayload.tokensUsed = completion.tokensUsed;
    }

    await this.dispatchAiReply(dispatchPayload);

    return {
      queued: false,
      message: "AI reply sent",
    };
  }

  async getSettings(userId: string, organizationId: string): Promise<AiSettingsResponse> {
    await this.requireMembership(userId, organizationId);

    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        aiEnabled: true,
        aiMode: true,
        aiSystemPrompt: true,
        aiModel: true,
        aiTemperature: true,
        aiMaxTokens: true,
        n8nWebhookUrl: true,
      },
    });

    if (!organization) {
      throw new NotFoundError("Organization");
    }

    return toAiSettingsResponse(organization);
  }

  async updateSettings(
    userId: string,
    organizationId: string,
    input: UpdateAiSettingsInput,
  ): Promise<AiSettingsResponse> {
    await this.requireAdminMembership(userId, organizationId);

    const updateData: Prisma.OrganizationUpdateInput = {};

    if (input.aiMode !== undefined) {
      updateData.aiMode = input.aiMode;
      updateData.aiEnabled = input.aiMode !== "OFF";
    }

    if (input.aiSystemPrompt !== undefined) {
      updateData.aiSystemPrompt = input.aiSystemPrompt ? sanitizeMultilineText(input.aiSystemPrompt) : null;
    }

    if (input.aiModel !== undefined) {
      updateData.aiModel = sanitizeText(input.aiModel);
    }

    if (input.aiTemperature !== undefined) {
      updateData.aiTemperature = input.aiTemperature;
    }

    if (input.aiMaxTokens !== undefined) {
      updateData.aiMaxTokens = input.aiMaxTokens;
    }

    if (input.n8nWebhookUrl !== undefined) {
      updateData.n8nWebhookUrl = input.n8nWebhookUrl;
    }

    await prisma.organization.update({
      where: {
        id: organizationId,
      },
      data: updateData,
    });

    return this.getSettings(userId, organizationId);
  }

  async listTrainingDocs(userId: string, organizationId: string): Promise<TrainingDocResponse[]> {
    await this.requireMembership(userId, organizationId);

    const docs = await prisma.aiTrainingDoc.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return docs.map(toTrainingDocResponse);
  }

  async createTrainingDoc(
    userId: string,
    organizationId: string,
    input: CreateTrainingDocBodyInput,
    file?: CreateTrainingDocFileInput,
  ): Promise<TrainingDocResponse> {
    await this.requireAdminMembership(userId, organizationId);

    const providedContent = input.content ? sanitizeMultilineText(input.content) : "";
    const providedTitle = input.title ? sanitizeText(input.title) : "";

    if (!file && !providedContent) {
      throw new BadRequestError("Either content or file is required for training docs");
    }

    let fileUrl: string | undefined;
    let fileType: string | undefined;
    let extractedContent = providedContent;

    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        throw new BadRequestError("Training file size must be at most 15MB");
      }

      await this.ensureTrainingBucket();

      const extension = file.originalName.includes(".")
        ? file.originalName.split(".").pop()?.toLowerCase() ?? "txt"
        : "txt";

      const baseName = sanitizeText(file.originalName).replace(/\s+/g, "-").toLowerCase() || "training-doc";
      const path = `${organizationId}/${Date.now()}-${baseName}.${extension}`;

      const upload = await supabaseAdmin.storage.from(TRAINING_BUCKET).upload(path, file.buffer, {
        contentType: file.mimeType,
        upsert: false,
      });

      if (upload.error) {
        throw new BadRequestError("Failed to upload training document", upload.error.message);
      }

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from(TRAINING_BUCKET).getPublicUrl(path);

      fileUrl = publicUrl;
      fileType = file.mimeType;

      const lowerMime = file.mimeType.toLowerCase();
      const isTextLike =
        lowerMime.startsWith("text/") ||
        lowerMime.includes("json") ||
        lowerMime.includes("xml") ||
        lowerMime.includes("csv") ||
        lowerMime.includes("markdown");

      if (!extractedContent && isTextLike) {
        extractedContent = sanitizeMultilineText(file.buffer.toString("utf8"));
      }
    }

    if (!extractedContent) {
      extractedContent = file ? `Uploaded file: ${file.originalName}` : "Training document";
    }

    const created = await prisma.aiTrainingDoc.create({
      data: {
        organizationId,
        title: providedTitle || file?.originalName || "Training Document",
        content: trimContext(extractedContent, 200000),
        fileUrl: fileUrl ?? null,
        fileType: fileType ?? null,
        isActive: true,
      },
    });

    return toTrainingDocResponse(created);
  }

  async deleteTrainingDoc(userId: string, organizationId: string, docId: string): Promise<void> {
    await this.requireAdminMembership(userId, organizationId);

    const existing = await prisma.aiTrainingDoc.findFirst({
      where: {
        id: docId,
        organizationId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Training document");
    }

    await prisma.aiTrainingDoc.delete({
      where: {
        id: docId,
      },
    });

    if (existing.fileUrl && existing.fileUrl.includes(`/${TRAINING_BUCKET}/`)) {
      const marker = `/${TRAINING_BUCKET}/`;
      const index = existing.fileUrl.indexOf(marker);
      if (index > -1) {
        const path = existing.fileUrl.slice(index + marker.length);
        if (path) {
          const { error } = await supabaseAdmin.storage.from(TRAINING_BUCKET).remove([path]);
          if (error) {
            logger.warn("Failed to remove training file from storage", {
              organizationId,
              docId,
              path,
              error: error.message,
            });
          }
        }
      }
    }
  }

  async testAi(userId: string, organizationId: string, input: AiTestInput): Promise<{
    response: string;
    model: string;
    tokensUsed?: number;
    confidence?: number;
  }> {
    await this.requireMembership(userId, organizationId);

    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        aiSystemPrompt: true,
        aiModel: true,
        aiTemperature: true,
        aiMaxTokens: true,
      },
    });

    if (!organization) {
      throw new NotFoundError("Organization");
    }

    const trainingContext = await this.buildTrainingContext(organizationId);
    const conversationHistory = input.conversationId
      ? await this.buildConversationHistory(input.conversationId)
      : [];

    const completion = await openaiClient.generateReply({
      systemPrompt:
        organization.aiSystemPrompt ??
        "You are an expert customer support assistant. Provide short and useful responses.",
      model: organization.aiModel,
      temperature: organization.aiTemperature,
      maxTokens: organization.aiMaxTokens,
      trainingContext,
      conversationHistory,
      latestUserMessage: input.message,
    });

    return {
      response: completion.content,
      model: completion.model,
      ...(typeof completion.tokensUsed === "number" ? { tokensUsed: completion.tokensUsed } : {}),
      ...(typeof completion.confidence === "number" ? { confidence: completion.confidence } : {}),
    };
  }

  async triggerFromConversation(input: TriggerAiReplyInput): Promise<{ queued: boolean; message: string }> {
    const context = await this.buildAiContext(input.organizationId, input.conversationId);

    if (!context.conversation.aiEnabled) {
      throw new BadRequestError("AI is disabled for this conversation");
    }

    if (!context.conversation.organization.aiEnabled && !input.force) {
      throw new BadRequestError("Organization AI is disabled");
    }

    if (context.conversation.organization.aiMode === "OFF" && !input.force) {
      throw new BadRequestError("Organization AI mode is OFF");
    }

    await this.setConversationAiHandling(input.organizationId, input.conversationId, true);
    await realtimeService.broadcastAiProcessing(input.organizationId, input.conversationId);

    try {
      const result = await this.enqueueOrGenerateAutoReply(context);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "AI reply failed";
      await this.broadcastAiError(input.organizationId, input.conversationId, errorMessage);
      throw error;
    }
  }

  async handleInboundMessage(input: TriggerInboundAiInput): Promise<void> {
    const context = await this.buildAiContext(input.organizationId, input.conversationId);
    const aiMode = context.conversation.organization.aiMode;

    if (!context.conversation.organization.aiEnabled || aiMode === "OFF") {
      return;
    }

    if (!context.conversation.aiEnabled) {
      return;
    }

    if (aiMode === "SUGGESTION") {
      try {
        const suggestion = await this.generateSuggestion(context);
        await realtimeService.broadcastAiSuggestion(input.organizationId, input.conversationId, suggestion);
      } catch (error) {
        logger.warn("Failed to generate AI suggestion", {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          inboundMessageId: input.inboundMessageId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
      return;
    }

    await this.setConversationAiHandling(input.organizationId, input.conversationId, true);
    await realtimeService.broadcastAiProcessing(input.organizationId, input.conversationId);

    try {
      await this.enqueueOrGenerateAutoReply(context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "AI reply failed";
      await this.broadcastAiError(input.organizationId, input.conversationId, errorMessage);
    }
  }

  async handleN8nCallback(payload: N8nCallbackPayload): Promise<void> {
    const organizationId = payload.organizationId;
    const conversationId = payload.conversationId;
    const aiResponse = payload.aiResponse;

    if (!organizationId || !conversationId) {
      throw new BadRequestError("organizationId and conversationId are required");
    }

    if (payload.error) {
      await this.broadcastAiError(organizationId, conversationId, payload.error);
      return;
    }

    if (!aiResponse || !aiResponse.trim()) {
      await this.broadcastAiError(organizationId, conversationId, "n8n callback returned empty response");
      return;
    }

    const context = await this.buildAiContext(organizationId, conversationId);

    await this.dispatchAiReply({
      context,
      aiResponse,
      ...(typeof payload.confidence === "number" ? { confidence: payload.confidence } : {}),
      ...(typeof payload.tokensUsed === "number" ? { tokensUsed: payload.tokensUsed } : {}),
      ...(payload.model ? { model: payload.model } : {}),
    });
  }
}

export const aiService = new AiService();
