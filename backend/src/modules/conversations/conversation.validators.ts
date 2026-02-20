import { z } from "zod";

const conversationStatusSchema = z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"]);
const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const channelTypeSchema = z.enum(["FACEBOOK", "INSTAGRAM", "WHATSAPP", "WEBCHAT", "TELEGRAM", "EMAIL"]);

const toUpperTrimmed = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().toUpperCase();
};

export const orgIdParamsSchema = z.object({
  orgId: z.string().min(1),
});

export const conversationParamsSchema = z.object({
  orgId: z.string().min(1),
  id: z.string().min(1),
});

export const listConversationsQuerySchema = z.object({
  status: z.preprocess(toUpperTrimmed, conversationStatusSchema).optional(),
  channel: z.preprocess(toUpperTrimmed, channelTypeSchema).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  assignedTo: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z
    .enum([
      "lastMessageAt",
      "-lastMessageAt",
      "createdAt",
      "-createdAt",
      "updatedAt",
      "-updatedAt",
      "priority",
      "-priority",
    ])
    .optional(),
});

export const updateConversationSchema = z
  .object({
    status: z.preprocess(toUpperTrimmed, conversationStatusSchema).optional(),
    priority: z.preprocess(toUpperTrimmed, prioritySchema).optional(),
    subject: z.string().trim().min(1).max(200).optional().nullable(),
    assignedToId: z.string().trim().min(1).max(80).optional().nullable(),
    aiEnabled: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional().nullable(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

export const assignConversationSchema = z.object({
  assignedToId: z.string().trim().min(1).max(80).nullable(),
});

export const updateConversationAiSchema = z.object({
  aiEnabled: z.boolean(),
});

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type AssignConversationInput = z.infer<typeof assignConversationSchema>;
export type UpdateConversationAiInput = z.infer<typeof updateConversationAiSchema>;

