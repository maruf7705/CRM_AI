import type { Response } from "express";

export const sanitizeText = (input: string): string =>
  input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/<script.*?>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

export const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const successResponse = <T>(res: Response, data: T, statusCode = 200): Response =>
  res.status(statusCode).json({ success: true, data });

export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  meta: { total: number; page: number; limit: number; totalPages: number },
): Response => res.status(200).json({ success: true, data, meta });
