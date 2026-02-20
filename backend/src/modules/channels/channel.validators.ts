import { z } from "zod";

export const channelTypeSchema = z.enum(["FACEBOOK", "INSTAGRAM", "WHATSAPP", "WEBCHAT", "TELEGRAM", "EMAIL"]);
export const oauthConnectTypeSchema = z.enum(["FACEBOOK", "INSTAGRAM"]);

export const orgIdParamsSchema = z.object({
  orgId: z.string().min(1),
});

export const channelParamsSchema = z.object({
  orgId: z.string().min(1),
  id: z.string().min(1),
});

export const oauthConnectParamsSchema = z.object({
  orgId: z.string().min(1),
  type: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase())
    .pipe(oauthConnectTypeSchema),
});

export const oauthConnectUrlQuerySchema = z.object({
  redirectUri: z.string().trim().url(),
  state: z.string().trim().min(4).max(255).optional(),
});

export const oauthConnectCallbackSchema = z.object({
  code: z.string().trim().min(1).max(2000),
  redirectUri: z.string().trim().url(),
  state: z.string().trim().min(4).max(255).optional(),
  channelName: z.string().trim().min(2).max(120).optional(),
  externalId: z.string().trim().min(1).max(255).optional(),
});

export const createChannelSchema = z.object({
  type: channelTypeSchema,
  name: z.string().trim().min(2).max(120),
  externalId: z.string().trim().min(1).max(200).optional().nullable(),
  webhookSecret: z.string().trim().min(1).max(255).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  credentials: z.record(z.unknown()),
  isActive: z.boolean().optional(),
});

export const updateChannelSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    externalId: z.string().trim().min(1).max(200).optional().nullable(),
    webhookSecret: z.string().trim().min(1).max(255).optional().nullable(),
    metadata: z.record(z.unknown()).optional().nullable(),
    credentials: z.record(z.unknown()).optional(),
    isActive: z.boolean().optional(),
    lastSyncAt: z.string().datetime().optional().nullable(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type OauthConnectType = z.infer<typeof oauthConnectTypeSchema>;
export type OauthConnectUrlQuery = z.infer<typeof oauthConnectUrlQuerySchema>;
export type OauthConnectCallbackInput = z.infer<typeof oauthConnectCallbackSchema>;
