import cors, { CorsOptions } from "cors";
import { env } from "./env";

const normalizeOrigin = (value: string): string => value.trim().replace(/\/+$/, "");

const wildcardToRegex = (rule: string): RegExp =>
  new RegExp(`^${rule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*")}$`);

const configuredOriginRules = [
  env.FRONTEND_URL,
  ...(env.CORS_ALLOWED_ORIGINS
    ?.split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0) ?? []),
].map(normalizeOrigin);

const exactAllowedOrigins = new Set<string>(configuredOriginRules.filter((rule) => !rule.includes("*")));
const wildcardAllowedOrigins = configuredOriginRules
  .filter((rule) => rule.includes("*"))
  .map((rule) => wildcardToRegex(rule));

const isAllowedOrigin = (origin: string): boolean => {
  const normalizedOrigin = normalizeOrigin(origin);

  if (exactAllowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  if (wildcardAllowedOrigins.some((regex) => regex.test(normalizedOrigin))) {
    return true;
  }

  if (env.NODE_ENV !== "production" && /^https?:\/\/localhost(?::\d+)?$/i.test(normalizedOrigin)) {
    return true;
  }

  return false;
};

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

export const corsMiddleware = cors(corsOptions);
