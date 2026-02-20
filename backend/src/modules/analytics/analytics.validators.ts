import { z } from "zod";

const normalizeOptionalString = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date format");

export const orgIdParamsSchema = z.object({
  orgId: z.string().min(1),
});

export const analyticsRangeQuerySchema = z.object({
  from: z.preprocess(normalizeOptionalString, dateStringSchema).optional(),
  to: z.preprocess(normalizeOptionalString, dateStringSchema).optional(),
});

export type AnalyticsRangeQuery = z.infer<typeof analyticsRangeQuerySchema>;
