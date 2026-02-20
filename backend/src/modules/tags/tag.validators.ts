import { z } from "zod";

const colorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex code");

export const orgIdParamsSchema = z.object({
  orgId: z.string().min(1),
});

export const tagParamsSchema = z.object({
  orgId: z.string().min(1),
  id: z.string().min(1),
});

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: colorSchema.optional(),
});

export const updateTagSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    color: colorSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
