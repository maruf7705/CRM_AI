import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { captureException, flushSentry, initSentry } from "./config/sentry";

initSentry();

const server = app.listen(env.PORT, () => {
  logger.info(`OmniDesk backend running on port ${env.PORT}`);
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.info(`Received ${signal}. Shutting down...`);

  server.close(async (serverError) => {
    if (serverError) {
      logger.error("HTTP server close failed", { error: serverError.message });
      process.exit(1);
      return;
    }

    try {
      await prisma.$disconnect();
      logger.info("Prisma disconnected");
      process.exit(0);
    } catch (disconnectError) {
      logger.error("Prisma disconnect failed", {
        error: disconnectError instanceof Error ? disconnectError.message : "Unknown error",
      });
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.message, stack: error.stack });
  captureException(error, { code: "UNCAUGHT_EXCEPTION" });
  void flushSentry().finally(() => {
    process.exit(1);
  });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
  captureException(reason, { code: "UNHANDLED_REJECTION" });
  void flushSentry().finally(() => {
    process.exit(1);
  });
});
