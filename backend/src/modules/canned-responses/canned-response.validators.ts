import { z } from "zod";

export const orgIdParamsSchema = z.object({
  orgId: z.string().min(1),
});

export const cannedResponseParamsSchema = z.object({
  orgId: z.string().min(1),
  id: z.string().min(1),
});

export const listCannedResponsesQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createCannedResponseSchema = z.object({
  shortcut: z.string().trim().min(2).max(40).regex(/^\/?[a-zA-Z0-9_-]+$/, "Invalid shortcut format"),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
  category: z.string().trim().min(1).max(120).optional().nullable(),
});

export const updateCannedResponseSchema = z
  .object({
    shortcut: z.string().trim().min(2).max(40).regex(/^\/?[a-zA-Z0-9_-]+$/, "Invalid shortcut format").optional(),
    title: z.string().trim().min(1).max(120).optional(),
    content: z.string().trim().min(1).max(5000).optional(),
    category: z.string().trim().min(1).max(120).optional().nullable(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

export type ListCannedResponsesQuery = z.infer<typeof listCannedResponsesQuerySchema>;
export type CreateCannedResponseInput = z.infer<typeof createCannedResponseSchema>;
export type UpdateCannedResponseInput = z.infer<typeof updateCannedResponseSchema>;
