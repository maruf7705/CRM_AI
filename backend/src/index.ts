import "dotenv/config";
import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";

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
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
  process.exit(1);
});
