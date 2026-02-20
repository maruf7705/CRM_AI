import type { ErrorRequestHandler } from "express";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { captureException } from "../config/sentry";
import { AppError } from "../utils/errors";

export const errorHandlerMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = error instanceof AppError ? error : null;
  const statusCode = appError?.statusCode ?? 500;
  const code = appError?.code ?? "INTERNAL_SERVER_ERROR";
  const message = appError?.message ?? "Unexpected server error";

  logger.error("Request failed", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.auth?.userId,
    organizationId: req.auth?.organizationId,
    statusCode,
    code,
    stack: error instanceof Error ? error.stack : undefined,
    details: appError?.details,
  });

  if (statusCode >= 500) {
    captureException(error, {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      userId: req.auth?.userId,
      organizationId: req.auth?.organizationId,
      statusCode,
      code,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: appError?.details,
      ...(env.NODE_ENV !== "production" && error instanceof Error
        ? { debug: { stack: error.stack } }
        : {}),
    },
  });
};
