import { Prisma, type Contact, type ContactStage, type Tag } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { toOffsetPagination } from "../../utils/pagination";
import { sanitizeText } from "../../utils/helpers";
import type {
  AddContactTagsInput,
  ContactConversationsQuery,
  CreateContactInput,
  ListContactsQuery,
  UpdateContactInput,
} from "./contact.validators";

interface ContactTagSummary {
  id: string;
  name: string;
  color: string;
}

interface ContactResponse {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  facebookId?: string;
  instagramId?: string;
  whatsappId?: string;
  telegramId?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  leadScore: number;
  stage: ContactStage;
  customFields?: Record<string, unknown>;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: ContactTagSummary[];
  conversationCount: number;
}

interface ContactConversationsResponse {
  id: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  subject?: string;
  channel: {
    id: string;
    type: "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "WEBCHAT" | "TELEGRAM" | "EMAIL";
    name: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ListContactsResult {
  data: ContactResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ListContactConversationsResult {
  data: ContactConversationsResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type ContactRecord = Contact & {
  tags: Array<{ tag: Tag }>;
  _count: { conversations: number };
};

const sanitizeNullableText = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const cleaned = sanitizeText(value);
  if (!cleaned) {
    return null;
  }

  return cleaned;
};

const sanitizeOptionalText = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const cleaned = sanitizeText(value);
  if (!cleaned) {
    return undefined;
  }

  return cleaned;
};

const sanitizeNullableEmail = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const cleaned = sanitizeText(value).toLowerCase();
  if (!cleaned) {
    return null;
  }

  return cleaned;
};

const resolveDisplayName = (input: {
  displayName?: string | undefined;
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
}): string => {
  const directDisplayName = sanitizeOptionalText(input.displayName);
  if (directDisplayName) {
    return directDisplayName;
  }

  const firstName = sanitizeNullableText(input.firstName) ?? "";
  const lastName = sanitizeNullableText(input.lastName) ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName.length > 0) {
    return fullName;
  }

  const fallback = sanitizeNullableEmail(input.email) ?? sanitizeNullableText(input.phone);
  if (fallback) {
    return fallback;
  }

  return "Unknown Contact";
};

const toContactResponse = (contact: ContactRecord): ContactResponse => {
  const payload: ContactResponse = {
    id: contact.id,
    displayName: contact.displayName,
    leadScore: contact.leadScore,
    stage: contact.stage,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    tags: contact.tags.map((entry) => ({
      id: entry.tag.id,
      name: entry.tag.name,
      color: entry.tag.color,
    })),
    conversationCount: contact._count.conversations,
  };

  if (contact.firstName) {
    payload.firstName = contact.firstName;
  }

  if (contact.lastName) {
    payload.lastName = contact.lastName;
  }

  if (contact.email) {
    payload.email = contact.email;
  }

  if (contact.phone) {
    payload.phone = contact.phone;
  }

  if (contact.avatar) {
    payload.avatar = contact.avatar;
  }

  if (contact.facebookId) {
    payload.facebookId = contact.facebookId;
  }

  if (contact.instagramId) {
    payload.instagramId = contact.instagramId;
  }

  if (contact.whatsappId) {
    payload.whatsappId = contact.whatsappId;
  }

  if (contact.telegramId) {
    payload.telegramId = contact.telegramId;
  }

  if (contact.company) {
    payload.company = contact.company;
  }

  if (contact.jobTitle) {
    payload.jobTitle = contact.jobTitle;
  }

  if (contact.notes) {
    payload.notes = contact.notes;
  }

  if (contact.customFields && typeof contact.customFields === "object") {
    payload.customFields = contact.customFields as Record<string, unknown>;
  }

  if (contact.lastSeenAt) {
    payload.lastSeenAt = contact.lastSeenAt;
  }

  return payload;
};

const parseSort = (
  sort: ListContactsQuery["sort"],
): Prisma.ContactOrderByWithRelationInput => {
  switch (sort) {
    case "createdAt":
      return { createdAt: "asc" };
    case "-createdAt":
      return { createdAt: "desc" };
    case "updatedAt":
      return { updatedAt: "asc" };
    case "-updatedAt":
      return { updatedAt: "desc" };
    case "leadScore":
      return { leadScore: "asc" };
    case "-leadScore":
      return { leadScore: "desc" };
    case "displayName":
      return { displayName: "asc" };
    case "-displayName":
      return { displayName: "desc" };
    case "lastSeenAt":
      return { lastSeenAt: "asc" };
    case "-lastSeenAt":
      return { lastSeenAt: "desc" };
    default:
      return { updatedAt: "desc" };
  }
};

export class ContactService {
  private async requireMembership(userId: string, orgId: string): Promise<void> {
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenError("You do not have access to this organization");
    }
  }

  private async requireContact(orgId: string, contactId: string): Promise<ContactRecord> {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId: orgId,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundError("Contact");
    }

    return contact;
  }

  private normalizeCustomFields(
    fields: Record<string, unknown> | null | undefined,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (fields === undefined) {
      return undefined;
    }

    if (fields === null) {
      return Prisma.JsonNull;
    }

    return fields as Prisma.InputJsonValue;
  }

  async listContacts(userId: string, orgId: string, query: ListContactsQuery): Promise<ListContactsResult> {
    await this.requireMembership(userId, orgId);

    const pagination = toOffsetPagination(query, { page: 1, limit: 20 });
    const search = query.search ? sanitizeText(query.search) : undefined;

    const where: Prisma.ContactWhereInput = {
      organizationId: orgId,
    };

    if (query.stage) {
      where.stage = query.stage;
    }

    if (query.tagId) {
      where.tags = {
        some: {
          tagId: query.tagId,
        },
      };
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: parseSort(query.sort),
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              conversations: true,
            },
          },
        },
      }),
    ]);

    return {
      data: contacts.map(toContactResponse),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  async createContact(userId: string, orgId: string, input: CreateContactInput): Promise<ContactResponse> {
    await this.requireMembership(userId, orgId);

    const firstName = sanitizeNullableText(input.firstName);
    const lastName = sanitizeNullableText(input.lastName);
    const email = sanitizeNullableEmail(input.email);
    const phone = sanitizeNullableText(input.phone);
    const displayName = resolveDisplayName({
      displayName: input.displayName,
      firstName,
      lastName,
      email,
      phone,
    });

    const normalizedFacebookId = sanitizeNullableText(input.facebookId);
    if (normalizedFacebookId) {
      const duplicate = await prisma.contact.findFirst({
        where: {
          organizationId: orgId,
          facebookId: normalizedFacebookId,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictError("A contact with this Facebook id already exists");
      }
    }

    const normalizedInstagramId = sanitizeNullableText(input.instagramId);
    if (normalizedInstagramId) {
      const duplicate = await prisma.contact.findFirst({
        where: {
          organizationId: orgId,
          instagramId: normalizedInstagramId,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictError("A contact with this Instagram id already exists");
      }
    }

    const normalizedWhatsappId = sanitizeNullableText(input.whatsappId);
    if (normalizedWhatsappId) {
      const duplicate = await prisma.contact.findFirst({
        where: {
          organizationId: orgId,
          whatsappId: normalizedWhatsappId,
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictError("A contact with this WhatsApp id already exists");
      }
    }

    const createData: Prisma.ContactUncheckedCreateInput = {
      organizationId: orgId,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      displayName,
      email: email ?? null,
      phone: phone ?? null,
      avatar: sanitizeNullableText(input.avatar) ?? null,
      facebookId: normalizedFacebookId ?? null,
      instagramId: normalizedInstagramId ?? null,
      whatsappId: normalizedWhatsappId ?? null,
      telegramId: sanitizeNullableText(input.telegramId) ?? null,
      company: sanitizeNullableText(input.company) ?? null,
      jobTitle: sanitizeNullableText(input.jobTitle) ?? null,
      notes: sanitizeNullableText(input.notes) ?? null,
      leadScore: input.leadScore ?? 0,
      stage: input.stage ?? "NEW",
      lastSeenAt: input.lastSeenAt ? new Date(input.lastSeenAt) : null,
    };

    const normalizedCustomFields = this.normalizeCustomFields(input.customFields);
    if (normalizedCustomFields !== undefined) {
      createData.customFields = normalizedCustomFields;
    }

    const contact = await prisma.contact.create({
      data: createData,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    return toContactResponse(contact);
  }

  async getContact(userId: string, orgId: string, contactId: string): Promise<ContactResponse> {
    await this.requireMembership(userId, orgId);
    const contact = await this.requireContact(orgId, contactId);
    return toContactResponse(contact);
  }

  async updateContact(
    userId: string,
    orgId: string,
    contactId: string,
    input: UpdateContactInput,
  ): Promise<ContactResponse> {
    await this.requireMembership(userId, orgId);
    const current = await this.requireContact(orgId, contactId);

    const updateData: Prisma.ContactUpdateInput = {};
    let nextFirstName = current.firstName;
    let nextLastName = current.lastName;
    let nextEmail = current.email;
    let nextPhone = current.phone;

    if (input.firstName !== undefined) {
      const normalized = sanitizeNullableText(input.firstName);
      updateData.firstName = normalized ?? null;
      nextFirstName = normalized ?? null;
    }

    if (input.lastName !== undefined) {
      const normalized = sanitizeNullableText(input.lastName);
      updateData.lastName = normalized ?? null;
      nextLastName = normalized ?? null;
    }

    if (input.email !== undefined) {
      const normalized = sanitizeNullableEmail(input.email);
      updateData.email = normalized ?? null;
      nextEmail = normalized ?? null;
    }

    if (input.phone !== undefined) {
      const normalized = sanitizeNullableText(input.phone);
      updateData.phone = normalized ?? null;
      nextPhone = normalized ?? null;
    }

    if (input.avatar !== undefined) {
      const normalized = sanitizeNullableText(input.avatar);
      updateData.avatar = normalized ?? null;
    }

    if (input.facebookId !== undefined) {
      const normalized = sanitizeNullableText(input.facebookId);
      if (normalized) {
        const duplicate = await prisma.contact.findFirst({
          where: {
            id: { not: contactId },
            organizationId: orgId,
            facebookId: normalized,
          },
          select: { id: true },
        });

        if (duplicate) {
          throw new ConflictError("A contact with this Facebook id already exists");
        }
      }

      updateData.facebookId = normalized ?? null;
    }

    if (input.instagramId !== undefined) {
      const normalized = sanitizeNullableText(input.instagramId);
      if (normalized) {
        const duplicate = await prisma.contact.findFirst({
          where: {
            id: { not: contactId },
            organizationId: orgId,
            instagramId: normalized,
          },
          select: { id: true },
        });

        if (duplicate) {
          throw new ConflictError("A contact with this Instagram id already exists");
        }
      }

      updateData.instagramId = normalized ?? null;
    }

    if (input.whatsappId !== undefined) {
      const normalized = sanitizeNullableText(input.whatsappId);
      if (normalized) {
        const duplicate = await prisma.contact.findFirst({
          where: {
            id: { not: contactId },
            organizationId: orgId,
            whatsappId: normalized,
          },
          select: { id: true },
        });

        if (duplicate) {
          throw new ConflictError("A contact with this WhatsApp id already exists");
        }
      }

      updateData.whatsappId = normalized ?? null;
    }

    if (input.telegramId !== undefined) {
      const normalized = sanitizeNullableText(input.telegramId);
      updateData.telegramId = normalized ?? null;
    }

    if (input.company !== undefined) {
      const normalized = sanitizeNullableText(input.company);
      updateData.company = normalized ?? null;
    }

    if (input.jobTitle !== undefined) {
      const normalized = sanitizeNullableText(input.jobTitle);
      updateData.jobTitle = normalized ?? null;
    }

    if (input.notes !== undefined) {
      const normalized = sanitizeNullableText(input.notes);
      updateData.notes = normalized ?? null;
    }

    if (input.leadScore !== undefined) {
      updateData.leadScore = input.leadScore;
    }

    if (input.stage !== undefined) {
      updateData.stage = input.stage;
    }

    if (input.customFields !== undefined) {
      const normalizedCustomFields = this.normalizeCustomFields(input.customFields);
      if (normalizedCustomFields !== undefined) {
        updateData.customFields = normalizedCustomFields;
      }
    }

    if (input.lastSeenAt !== undefined) {
      updateData.lastSeenAt = input.lastSeenAt ? new Date(input.lastSeenAt) : null;
    }

    if (input.displayName !== undefined) {
      const normalized = sanitizeOptionalText(input.displayName);
      if (!normalized) {
        throw new BadRequestError("Display name cannot be empty");
      }
      updateData.displayName = normalized;
    } else if (input.firstName !== undefined || input.lastName !== undefined) {
      updateData.displayName = resolveDisplayName({
        firstName: nextFirstName,
        lastName: nextLastName,
        email: nextEmail,
        phone: nextPhone,
      });
    }

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    return toContactResponse(updated);
  }

  async deleteContact(userId: string, orgId: string, contactId: string): Promise<void> {
    await this.requireMembership(userId, orgId);
    await this.requireContact(orgId, contactId);

    await prisma.contact.delete({
      where: {
        id: contactId,
      },
    });
  }

  async addTags(
    userId: string,
    orgId: string,
    contactId: string,
    input: AddContactTagsInput,
  ): Promise<ContactResponse> {
    await this.requireMembership(userId, orgId);
    await this.requireContact(orgId, contactId);

    const uniqueTagIds = Array.from(new Set(input.tagIds));
    const tags = await prisma.tag.findMany({
      where: {
        organizationId: orgId,
        id: {
          in: uniqueTagIds,
        },
      },
      select: { id: true },
    });

    if (tags.length !== uniqueTagIds.length) {
      throw new NotFoundError("One or more tags");
    }

    await prisma.contactTag.createMany({
      data: uniqueTagIds.map((tagId) => ({ contactId, tagId })),
      skipDuplicates: true,
    });

    const updated = await this.requireContact(orgId, contactId);
    return toContactResponse(updated);
  }

  async removeTag(userId: string, orgId: string, contactId: string, tagId: string): Promise<ContactResponse> {
    await this.requireMembership(userId, orgId);
    await this.requireContact(orgId, contactId);

    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        organizationId: orgId,
      },
      select: { id: true },
    });

    if (!tag) {
      throw new NotFoundError("Tag");
    }

    const deleted = await prisma.contactTag.deleteMany({
      where: {
        contactId,
        tagId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundError("Contact tag");
    }

    const updated = await this.requireContact(orgId, contactId);
    return toContactResponse(updated);
  }

  async listContactConversations(
    userId: string,
    orgId: string,
    contactId: string,
    query: ContactConversationsQuery,
  ): Promise<ListContactConversationsResult> {
    await this.requireMembership(userId, orgId);
    await this.requireContact(orgId, contactId);

    const pagination = toOffsetPagination(query, { page: 1, limit: 20 });

    const where: Prisma.ConversationWhereInput = {
      organizationId: orgId,
      contactId,
    };

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: {
          lastMessageAt: "desc",
        },
        include: {
          channel: true,
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      data: conversations.map((conversation) => {
        const payload: ContactConversationsResponse = {
          id: conversation.id,
          status: conversation.status,
          priority: conversation.priority,
          channel: {
            id: conversation.channel.id,
            type: conversation.channel.type,
            name: conversation.channel.name,
          },
          unreadCount: conversation.unreadCount,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };

        if (conversation.subject) {
          payload.subject = conversation.subject;
        }

        if (conversation.assignedTo) {
          payload.assignedTo = conversation.assignedTo;
        }

        if (conversation.lastMessageAt) {
          payload.lastMessageAt = conversation.lastMessageAt;
        }

        if (conversation.lastMessagePreview) {
          payload.lastMessagePreview = conversation.lastMessagePreview;
        }

        return payload;
      }),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }
}

export const contactService = new ContactService();

