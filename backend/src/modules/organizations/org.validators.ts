import { z } from "zod";

const roleSchema = z.enum(["OWNER", "ADMIN", "AGENT", "VIEWER"]);
const planSchema = z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]);
const aiModeSchema = z.enum(["OFF", "SUGGESTION", "AUTO_REPLY"]);

export const orgIdParamsSchema = z.object({
  orgId: z.string().min(1),
});

export const orgMemberParamsSchema = z.object({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
});

export const updateOrgSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    logo: z.string().url().optional().nullable(),
    plan: planSchema.optional(),
    maxAgents: z.number().int().min(1).max(500).optional(),
    maxChannels: z.number().int().min(1).max(200).optional(),
    aiEnabled: z.boolean().optional(),
    aiMode: aiModeSchema.optional(),
    aiSystemPrompt: z.string().max(10_000).optional().nullable(),
    aiModel: z.string().trim().min(2).max(100).optional(),
    aiTemperature: z.number().min(0).max(2).optional(),
    aiMaxTokens: z.number().int().min(64).max(8192).optional(),
    n8nWebhookUrl: z.string().url().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  role: roleSchema.default("AGENT"),
});

export const updateMemberSchema = z
  .object({
    role: roleSchema.optional(),
    isOnline: z.boolean().optional(),
    maxConcurrent: z.number().int().min(1).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
