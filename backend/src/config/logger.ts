import { createLogger, format, transports } from "winston";
import { env } from "./env";

const isProduction = env.NODE_ENV === "production";

export const logger = createLogger({
  level: isProduction ? "info" : "debug",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    isProduction
      ? format.json()
      : format.combine(
          format.colorize(),
          format.printf(({ level, message, timestamp, ...meta }) => {
            const metaChunk = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
            return `${timestamp} [${level}] ${message}${metaChunk}`;
          }),
        ),
  ),
  defaultMeta: {
    service: "omnidesk-backend",
  },
  transports: [new transports.Console()],
});
