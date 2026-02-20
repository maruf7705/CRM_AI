import { env } from "../../config/env";
import { AppError, BadRequestError } from "../../utils/errors";

export interface N8nQueuePayload {
  organizationId: string;
  conversationId: string;
  contactName: string;
  channelType: string;
  incomingMessage: string;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  systemPrompt: string;
  trainingContext?: string;
  model: string;
  temperature: number;
  callbackUrl: string;
  callbackSecret?: string;
}

interface QueueOptions {
  webhookUrl?: string | null;
}

export class N8nClient {
  async enqueueReply(payload: N8nQueuePayload, options?: QueueOptions): Promise<{ accepted: boolean }> {
    const webhookUrl = options?.webhookUrl ?? env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return { accepted: false };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new AppError(502, "N8N_REQUEST_FAILED", "n8n webhook request failed", {
          status: response.status,
          responseBody,
        });
      }

      return { accepted: true };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new BadRequestError("Unable to reach n8n webhook", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export const n8nClient = new N8nClient();

