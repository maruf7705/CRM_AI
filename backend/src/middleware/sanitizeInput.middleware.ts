import type { NextFunction, Request, Response } from "express";
import { sanitizeText } from "../utils/helpers";

const SENSITIVE_KEY_PATTERN = /(password|token|secret|signature|webhook|accesskey|apikey|otp|code)/i;
const MAX_DEPTH = 8;

const sanitizeSensitiveString = (value: string): string => value.replace(/[\u0000-\u001F\u007F]/g, "");

const sanitizeUnknown = (value: unknown, keyPath: string[], depth: number): unknown => {
  if (depth > MAX_DEPTH) {
    return value;
  }

  if (typeof value === "string") {
    const currentKey = keyPath[keyPath.length - 1] ?? "";
    return SENSITIVE_KEY_PATTERN.test(currentKey) ? sanitizeSensitiveString(value) : sanitizeText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item, keyPath, depth + 1));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      sanitizeUnknown(nestedValue, [...keyPath, key], depth + 1),
    ]);
    return Object.fromEntries(entries);
  }

  return value;
};

export const sanitizeInputMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.path.startsWith("/api/v1/webhooks")) {
    next();
    return;
  }

  req.body = sanitizeUnknown(req.body, [], 0);
  req.query = sanitizeUnknown(req.query, [], 0) as Request["query"];
  req.params = sanitizeUnknown(req.params, [], 0) as Request["params"];

  next();
};
