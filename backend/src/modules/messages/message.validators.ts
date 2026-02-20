import { z } from "zod";

const contentTypeSchema = z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE", "LOCATION", "STICKER", "TEMPLATE"]);

export const messageParamsSchema = z.object({
  orgId: z.string().min(1),
  convId: z.string().min(1),
});

export const listMessagesQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  contentType: contentTypeSchema.default("TEXT"),
  mediaUrl: z.string().trim().url().optional().nullable(),
  mediaMimeType: z.string().trim().min(1).max(120).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const aiReplySchema = z.object({
  force: z.boolean().optional(),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type AiReplyInput = z.infer<typeof aiReplySchema>;

