import type { Request, Response } from "express";
import { env } from "../../config/env";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { aiService } from "../ai/ai.service";
import { webhookService } from "./webhook.service";

type WebhookSource = "FACEBOOK" | "INSTAGRAM" | "WHATSAPP";

const extractChallengeQuery = (req: Request): {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
} => {
  const mode = typeof req.query["hub.mode"] === "string" ? req.query["hub.mode"] : null;
  const verifyToken =
    typeof req.query["hub.verify_token"] === "string" ? req.query["hub.verify_token"] : null;
  const challenge = typeof req.query["hub.challenge"] === "string" ? req.query["hub.challenge"] : null;

  return { mode, verifyToken, challenge };
};

const resolveRawBody = (req: Request): Buffer => {
  if (req.rawBody) {
    return req.rawBody;
  }

  return Buffer.from(JSON.stringify(req.body ?? {}));
};

const resolveSignatureHeader = (req: Request): string | undefined => {
  const signatureHeader = req.header("x-hub-signature-256") ?? req.header("x-hub-signature");
  return signatureHeader ?? undefined;
};

export class WebhookController {
  verify = (source: WebhookSource) => {
    return (req: Request, res: Response): void => {
      const { mode, verifyToken, challenge } = extractChallengeQuery(req);
      const value = webhookService.verifyChallenge(source, mode, verifyToken, challenge);
      res.status(200).send(value);
    };
  };

  receive = (source: WebhookSource) => {
    return async (req: Request, res: Response): Promise<void> => {
      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        throw new BadRequestError("Webhook payload is required");
      }

      const result = await webhookService.processWebhook(
        source,
        payload,
        resolveRawBody(req),
        resolveSignatureHeader(req),
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    };
  };

  n8nCallback = async (req: Request, res: Response): Promise<void> => {
    const configuredSecret = env.N8N_CALLBACK_SECRET;
    const receivedSecret = req.header("x-n8n-callback-secret") ?? req.header("x-omnidesk-callback-secret");

    if (configuredSecret && configuredSecret.length > 0 && receivedSecret !== configuredSecret) {
      throw new UnauthorizedError("Invalid callback secret");
    }

    await aiService.handleN8nCallback(req.body as {
      organizationId?: string;
      conversationId?: string;
      aiResponse?: string;
      confidence?: number;
      tokensUsed?: number;
      model?: string;
      error?: string;
    });

    res.status(200).json({
      success: true,
      data: {
        received: true,
      },
    });
  };
}

export const webhookController = new WebhookController();

