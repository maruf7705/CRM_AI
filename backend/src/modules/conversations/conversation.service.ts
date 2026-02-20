import { Prisma } from "@prisma/client";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { realtimeService } from "../realtime/realtime.service";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { sanitizeText } from "../../utils/helpers";
import { toOffsetPagination } from "../../utils/pagination";
import type {
  AssignConversationInput,
  ListConversationsQuery,
  UpdateConversationAiInput,
  UpdateConversationInput,
} from "./conversation.validators";

interface ConversationResponse {
  id: string;
  externalId?: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  subject?: string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  unreadCount: number;
  aiEnabled: boolean;
  isAiHandling: boolean;
  metadata?: Record<string, unknown>;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  channel: {
    id: string;
    type: "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "WEBCHAT" | "TELEGRAM" | "EMAIL";
    name: string;
  };
  contact: {
    id: string;
    displayName: string;
    stage: "NEW" | "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";
    email?: string;
    phone?: string;
    avatar?: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

interface ListConversationsResult {
  data: ConversationResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type ConversationRecord = Prisma.ConversationGetPayload<{
  include: {
    channel: true;
    contact: true;
    assignedTo: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        avatar: true;
      };
    };
  };
}>;

const toConversationResponse = (conversation: ConversationRecord): ConversationResponse => {
  const payload: ConversationResponse = {
    id: conversation.id,
    status: conversation.status,
    priority: conversation.priority,
    unreadCount: conversation.unreadCount,
    aiEnabled: conversation.aiEnabled,
    isAiHandling: conversation.isAiHandling,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    channel: {
      id: conversation.channel.id,
      type: conversation.channel.type,
      name: conversation.channel.name,
    },
    contact: {
      id: conversation.contact.id,
      displayName: conversation.contact.displayName,
      stage: conversation.contact.stage,
    },
  };

  if (conversation.externalId) {
    payload.externalId = conversation.externalId;
  }

  if (conversation.subject) {
    payload.subject = conversation.subject;
  }

  if (conversation.lastMessageAt) {
    payload.lastMessageAt = conversation.lastMessageAt;
  }

  if (conversation.lastMessagePreview) {
    payload.lastMessagePreview = conversation.lastMessagePreview;
  }

  if (conversation.closedAt) {
    payload.closedAt = conversation.closedAt;
  }

  if (conversation.metadata && typeof conversation.metadata === "object") {
    payload.metadata = conversation.metadata as Record<string, unknown>;
  }

  if (conversation.contact.email) {
    payload.contact.email = conversation.contact.email;
  }

  if (conversation.contact.phone) {
    payload.contact.phone = conversation.contact.phone;
  }

  if (conversation.contact.avatar) {
    payload.contact.avatar = conversation.contact.avatar;
  }

  if (conversation.assignedTo) {
    payload.assignedTo = {
      id: conversation.assignedTo.id,
      firstName: conversation.assignedTo.firstName,
      lastName: conversation.assignedTo.lastName,
    };

    if (conversation.assignedTo.avatar) {
      payload.assignedTo.avatar = conversation.assignedTo.avatar;
    }
  }

  return payload;
};

const parseSort = (
  sort: ListConversationsQuery["sort"],
): Prisma.ConversationOrderByWithRelationInput => {
  switch (sort) {
    case "lastMessageAt":
      return { lastMessageAt: "asc" };
    case "-lastMessageAt":
      return { lastMessageAt: "desc" };
    case "createdAt":
      return { createdAt: "asc" };
    case "-createdAt":
      return { createdAt: "desc" };
    case "updatedAt":
      return { updatedAt: "asc" };
    case "-updatedAt":
      return { updatedAt: "desc" };
    case "priority":
      return { priority: "asc" };
    case "-priority":
      return { priority: "desc" };
    default:
      return { lastMessageAt: "desc" };
  }
};

export class ConversationService {
  private async emitBroadcast(
    task: () => Promise<void>,
    context: Record<string, unknown>,
  ): Promise<void> {
    try {
      await task();
    } catch (error) {
      logger.warn("Realtime broadcast failed", {
        ...context,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async emitConversationUpdate(orgId: string, conversation: ConversationResponse): Promise<void> {
    await Promise.all([
      this.emitBroadcast(
        () =>
          realtimeService.broadcastConversationUpdate(orgId, conversation.id, {
            status: conversation.status,
            priority: conversation.priority,
            subject: conversation.subject ?? null,
            lastMessageAt: conversation.lastMessageAt ?? null,
            lastMessagePreview: conversation.lastMessagePreview ?? null,
            unreadCount: conversation.unreadCount,
            aiEnabled: conversation.aiEnabled,
            isAiHandling: conversation.isAiHandling,
            assignedToId: conversation.assignedTo?.id ?? null,
            closedAt: conversation.closedAt ?? null,
            updatedAt: conversation.updatedAt,
          }),
        { orgId, conversationId: conversation.id, event: "conversation_update" },
      ),
      this.emitBroadcast(
        () => realtimeService.broadcastUnreadUpdate(orgId, conversation.id, conversation.unreadCount),
        { orgId, conversationId: conversation.id, event: "unread_update" },
      ),
    ]);
  }

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

  private async requireConversation(orgId: string, conversationId: string): Promise<ConversationRecord> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: orgId,
      },
      include: {
        channel: true,
        contact: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation");
    }

    return conversation;
  }

  private async assertAssignableUser(orgId: string, userId: string): Promise<void> {
    const member = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
      include: {
        user: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundError("Assignable user");
    }

    if (member.role === "VIEWER") {
      throw new BadRequestError("Viewer members cannot be assigned to conversations");
    }

    if (!member.user.isActive) {
      throw new BadRequestError("Cannot assign inactive users");
    }
  }

  private normalizeMetadata(
    metadata: Record<string, unknown> | null | undefined,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (metadata === undefined) {
      return undefined;
    }

    if (metadata === null) {
      return Prisma.JsonNull;
    }

    return metadata as Prisma.InputJsonValue;
  }

  async listConversations(
    userId: string,
    orgId: string,
    query: ListConversationsQuery,
  ): Promise<ListConversationsResult> {
    await this.requireMembership(userId, orgId);

    const pagination = toOffsetPagination(query, { page: 1, limit: 20 });
    const search = query.search ? sanitizeText(query.search) : undefined;

    const where: Prisma.ConversationWhereInput = {
      organizationId: orgId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.channel) {
      where.channel = {
        is: {
          type: query.channel,
        },
      };
    }

    if (query.assignedTo) {
      where.assignedToId = query.assignedTo === "me" ? userId : query.assignedTo;
    }

    if (search) {
      where.OR = [
        {
          subject: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastMessagePreview: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          contact: {
            is: {
              displayName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          contact: {
            is: {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          contact: {
            is: {
              phone: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: parseSort(query.sort),
        include: {
          channel: true,
          contact: true,
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      }),
    ]);

    return {
      data: conversations.map(toConversationResponse),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  async getConversation(userId: string, orgId: string, conversationId: string): Promise<ConversationResponse> {
    await this.requireMembership(userId, orgId);
    const conversation = await this.requireConversation(orgId, conversationId);
    return toConversationResponse(conversation);
  }

  async updateConversation(
    userId: string,
    orgId: string,
    conversationId: string,
    input: UpdateConversationInput,
  ): Promise<ConversationResponse> {
    await this.requireMembership(userId, orgId);
    await this.requireConversation(orgId, conversationId);

    const updateData: Prisma.ConversationUpdateInput = {};

    if (input.status !== undefined) {
      updateData.status = input.status;
      updateData.closedAt = input.status === "CLOSED" ? new Date() : null;
    }

    if (input.priority !== undefined) {
      updateData.priority = input.priority;
    }

    if (input.subject !== undefined) {
      updateData.subject = input.subject ? sanitizeText(input.subject) : null;
    }

    if (input.assignedToId !== undefined) {
      if (input.assignedToId === null) {
        updateData.assignedTo = {
          disconnect: true,
        };
      } else {
        await this.assertAssignableUser(orgId, input.assignedToId);
        updateData.assignedTo = {
          connect: {
            id: input.assignedToId,
          },
        };
      }
    }

    if (input.aiEnabled !== undefined) {
      updateData.aiEnabled = input.aiEnabled;
      if (!input.aiEnabled) {
        updateData.isAiHandling = false;
      }
    }

    if (input.metadata !== undefined) {
      const normalizedMetadata = this.normalizeMetadata(input.metadata);
      if (normalizedMetadata !== undefined) {
        updateData.metadata = normalizedMetadata;
      }
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
      include: {
        channel: true,
        contact: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    const payload = toConversationResponse(updated);
    await this.emitConversationUpdate(orgId, payload);
    return payload;
  }

  async closeConversation(userId: string, orgId: string, conversationId: string): Promise<ConversationResponse> {
    await this.requireMembership(userId, orgId);
    await this.requireConversation(orgId, conversationId);

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
      include: {
        channel: true,
        contact: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    const payload = toConversationResponse(updated);
    await this.emitConversationUpdate(orgId, payload);
    return payload;
  }

  async reopenConversation(userId: string, orgId: string, conversationId: string): Promise<ConversationResponse> {
    await this.requireMembership(userId, orgId);
    await this.requireConversation(orgId, conversationId);

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: "OPEN",
        closedAt: null,
      },
      include: {
        channel: true,
        contact: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    const payload = toConversationResponse(updated);
    await this.emitConversationUpdate(orgId, payload);
    return payload;
  }

  async assignConversation(
    userId: string,
    orgId: string,
    conversationId: string,
    input: AssignConversationInput,
  ): Promise<ConversationResponse> {
    await this.requireMembership(userId, orgId);
    await this.requireConversation(orgId, conversationId);

    if (input.assignedToId) {
      await this.assertAssignableUser(orgId, input.assignedToId);
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedToId: input.assignedToId,
      },
      include: {
        channel: true,
        contact: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    const payload = toConversationResponse(updated);
    await this.emitConversationUpdate(orgId, payload);
    return payload;
  }

  async updateConversationAi(
    userId: string,
    orgId: string,
    conversationId: string,
    input: UpdateConversationAiInput,
  ): Promise<ConversationResponse> {
    await this.requireMembership(userId, orgId);
    await this.requireConversation(orgId, conversationId);

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        aiEnabled: input.aiEnabled,
        ...(input.aiEnabled ? {} : { isAiHandling: false }),
      },
      include: {
        channel: true,
        contact: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    const payload = toConversationResponse(updated);
    await this.emitConversationUpdate(orgId, payload);
    return payload;
  }
}

export const conversationService = new ConversationService();

