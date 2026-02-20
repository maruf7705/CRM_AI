import { z } from "zod";

export const orgIdParamsSchema = z.object({
  orgId: z.string().min(1),
});

export const trainingDocParamsSchema = z.object({
  orgId: z.string().min(1),
  id: z.string().min(1),
});

export const updateAiSettingsSchema = z
  .object({
    aiMode: z.enum(["OFF", "SUGGESTION", "AUTO_REPLY"]).optional(),
    aiSystemPrompt: z.string().trim().min(1).max(20_000).nullable().optional(),
    aiModel: z.string().trim().min(1).max(100).optional(),
    aiTemperature: z.number().min(0).max(2).optional(),
    aiMaxTokens: z.number().int().min(50).max(8_192).optional(),
    n8nWebhookUrl: z.string().trim().url().nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one setting field is required",
  });

export const createTrainingDocBodySchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  content: z.string().trim().min(1).max(200_000).optional(),
});

export const aiTestSchema = z.object({
  message: z.string().trim().min(1).max(10_000),
  conversationId: z.string().trim().min(1).optional(),
});

export type UpdateAiSettingsInput = z.infer<typeof updateAiSettingsSchema>;
export type CreateTrainingDocBodyInput = z.infer<typeof createTrainingDocBodySchema>;
export type AiTestInput = z.infer<typeof aiTestSchema>;
