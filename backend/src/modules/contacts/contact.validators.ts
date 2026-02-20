import { z } from "zod";

const contactStageSchema = z.enum(["NEW", "LEAD", "QUALIFIED", "CUSTOMER", "CHURNED"]);

const cleanOptionalString = z.string().trim().min(1).max(255).optional().nullable();

export const orgIdParamsSchema = z.object({
  orgId: z.string().min(1),
});

export const contactParamsSchema = z.object({
  orgId: z.string().min(1),
  id: z.string().min(1),
});

export const contactTagParamsSchema = z.object({
  orgId: z.string().min(1),
  id: z.string().min(1),
  tagId: z.string().min(1),
});

export const listContactsQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  stage: contactStageSchema.optional(),
  tagId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.enum(["createdAt", "-createdAt", "updatedAt", "-updatedAt", "leadScore", "-leadScore", "displayName", "-displayName", "lastSeenAt", "-lastSeenAt"]).optional(),
});

export const contactConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createContactSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional().nullable(),
  lastName: z.string().trim().min(1).max(80).optional().nullable(),
  displayName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(200).optional().nullable(),
  phone: cleanOptionalString,
  avatar: z.string().trim().url().optional().nullable(),
  facebookId: cleanOptionalString,
  instagramId: cleanOptionalString,
  whatsappId: cleanOptionalString,
  telegramId: cleanOptionalString,
  company: z.string().trim().min(1).max(120).optional().nullable(),
  jobTitle: z.string().trim().min(1).max(120).optional().nullable(),
  notes: z.string().trim().max(10_000).optional().nullable(),
  leadScore: z.number().int().min(0).max(100).optional(),
  stage: contactStageSchema.optional(),
  customFields: z.record(z.unknown()).optional().nullable(),
  lastSeenAt: z.string().datetime().optional().nullable(),
});

export const updateContactSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional().nullable(),
    lastName: z.string().trim().min(1).max(80).optional().nullable(),
    displayName: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().max(200).optional().nullable(),
    phone: cleanOptionalString,
    avatar: z.string().trim().url().optional().nullable(),
    facebookId: cleanOptionalString,
    instagramId: cleanOptionalString,
    whatsappId: cleanOptionalString,
    telegramId: cleanOptionalString,
    company: z.string().trim().min(1).max(120).optional().nullable(),
    jobTitle: z.string().trim().min(1).max(120).optional().nullable(),
    notes: z.string().trim().max(10_000).optional().nullable(),
    leadScore: z.number().int().min(0).max(100).optional(),
    stage: contactStageSchema.optional(),
    customFields: z.record(z.unknown()).optional().nullable(),
    lastSeenAt: z.string().datetime().optional().nullable(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

export const addContactTagsSchema = z.object({
  tagIds: z.array(z.string().min(1)).min(1).max(50),
});

export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
export type ContactConversationsQuery = z.infer<typeof contactConversationsQuerySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type AddContactTagsInput = z.infer<typeof addContactTagsSchema>;

