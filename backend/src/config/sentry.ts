import * as Sentry from "@sentry/node";
import { env } from "./env";
import { logger } from "./logger";

type SentryCaptureContext = {
  requestId?: string | undefined;
  method?: string | undefined;
  path?: string | undefined;
  userId?: string | undefined;
  organizationId?: string | undefined;
  statusCode?: number | undefined;
  code?: string | undefined;
};

let isInitialized = false;

const sentryEnabled = Boolean(env.SENTRY_DSN);

export const initSentry = (): void => {
  if (!sentryEnabled || isInitialized) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  isInitialized = true;
  logger.info("Sentry initialized", {
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });
};

export const captureException = (error: unknown, context?: SentryCaptureContext): void => {
  if (!isInitialized) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.requestId) {
      scope.setTag("request_id", context.requestId);
    }

    if (context?.method) {
      scope.setTag("http_method", context.method);
    }

    if (context?.path) {
      scope.setTag("http_path", context.path);
    }

    if (context?.code) {
      scope.setTag("error_code", context.code);
    }

    if (typeof context?.statusCode === "number") {
      scope.setTag("http_status", String(context.statusCode));
    }

    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context?.organizationId) {
      scope.setContext("organization", { id: context.organizationId });
    }

    Sentry.captureException(error);
  });
};

export const flushSentry = async (timeoutMs = 2000): Promise<void> => {
  if (!isInitialized) {
    return;
  }

  await Sentry.close(timeoutMs);
};
