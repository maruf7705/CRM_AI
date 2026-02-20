import express, { type Request, type Response } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { corsMiddleware } from "./config/cors";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";
import { supabaseAdmin } from "./config/supabase-admin";
import { errorHandlerMiddleware } from "./middleware/errorHandler.middleware";
import {
  globalRateLimiter,
  mutationRateLimiter,
  webhookRateLimiter,
} from "./middleware/rateLimiter.middleware";
import { requestLoggerMiddleware } from "./middleware/requestLogger.middleware";
import { sanitizeInputMiddleware } from "./middleware/sanitizeInput.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { aiRouter } from "./modules/ai/ai.routes";
import { analyticsRouter } from "./modules/analytics/analytics.routes";
import { cannedResponseRouter } from "./modules/canned-responses/canned-response.routes";
import { channelRouter } from "./modules/channels/channel.routes";
import { contactRouter } from "./modules/contacts/contact.routes";
import { conversationRouter } from "./modules/conversations/conversation.routes";
import { messageRouter } from "./modules/messages/message.routes";
import { notificationRouter } from "./modules/notifications/notification.routes";
import { orgRouter } from "./modules/organizations/org.routes";
import { tagRouter } from "./modules/tags/tag.routes";
import { userRouter } from "./modules/users/user.routes";
import { webhookRouter } from "./modules/webhooks/webhook.routes";

const checkDatabase = async (): Promise<boolean> => {
  await prisma.$queryRaw`SELECT 1`;
  return true;
};

const checkRedis = async (): Promise<boolean> => {
  const response = await redis.ping();
  return response === "PONG";
};

const checkSupabase = async (): Promise<boolean> => {
  const { error } = await supabaseAdmin.storage.listBuckets();
  return !error;
};

const buildHealthPayload = async () => {
  const [dbResult, redisResult, supabaseResult] = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkSupabase(),
  ]);

  const services = {
    database: dbResult.status === "fulfilled" && dbResult.value,
    redis: redisResult.status === "fulfilled" && redisResult.value,
    supabase: supabaseResult.status === "fulfilled" && supabaseResult.value,
  };

  const isHealthy = services.database && services.redis && services.supabase;

  return {
    status: isHealthy ? "ok" : "degraded",
    services,
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
  };
};

export const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(
  express.json({
    limit: "5mb",
    verify: (req, _res, buffer) => {
      (req as Request).rawBody = buffer;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalRateLimiter);
app.use(requestLoggerMiddleware);
app.use(sanitizeInputMiddleware);
app.use("/api/v1", mutationRateLimiter);

app.get("/api/v1/health/live", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: "alive",
      timestamp: new Date().toISOString(),
    },
  });
});

app.get("/api/v1/health", async (_req: Request, res: Response) => {
  try {
    const payload = await buildHealthPayload();

    res.status(payload.status === "ok" ? 200 : 503).json({
      success: payload.status === "ok",
      data: payload,
    });
  } catch (error) {
    logger.error("Failed to compute health status", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(503).json({
      success: false,
      error: {
        code: "HEALTHCHECK_FAILED",
        message: "Failed to run health checks",
      },
    });
  }
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/orgs", orgRouter);
app.use("/api/v1/orgs", channelRouter);
app.use("/api/v1/orgs", contactRouter);
app.use("/api/v1/orgs", conversationRouter);
app.use("/api/v1/orgs", messageRouter);
app.use("/api/v1/orgs", aiRouter);
app.use("/api/v1/orgs", analyticsRouter);
app.use("/api/v1/orgs", tagRouter);
app.use("/api/v1/orgs", cannedResponseRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/webhooks", webhookRateLimiter, webhookRouter);

app.use("/api/v1", (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Endpoint not found",
    },
  });
});

app.use(errorHandlerMiddleware);
