import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { sanitizeText } from "../../utils/helpers";
import { toOffsetPagination } from "../../utils/pagination";
import type {
  CreateCannedResponseInput,
  ListCannedResponsesQuery,
  UpdateCannedResponseInput,
} from "./canned-response.validators";

interface CannedResponsePayload {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string;
  createdAt: Date;
}

interface CannedResponsesListResult {
  data: CannedResponsePayload[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const normalizeShortcut = (raw: string): string => {
  const cleaned = sanitizeText(raw).toLowerCase();
  if (cleaned.startsWith("/")) {
    return cleaned;
  }

  return `/${cleaned}`;
};

const toPayload = (item: {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string | null;
  createdAt: Date;
}): CannedResponsePayload => {
  const payload: CannedResponsePayload = {
    id: item.id,
    shortcut: item.shortcut,
    title: item.title,
    content: item.content,
    createdAt: item.createdAt,
  };

  if (item.category) {
    payload.category = item.category;
  }

  return payload;
};

export class CannedResponseService {
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

  private async requireCannedResponse(orgId: string, id: string) {
    const item = await prisma.cannedResponse.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
    });

    if (!item) {
      throw new NotFoundError("Canned response");
    }

    return item;
  }

  async list(
    userId: string,
    orgId: string,
    query: ListCannedResponsesQuery,
  ): Promise<CannedResponsesListResult> {
    await this.requireMembership(userId, orgId);
    const pagination = toOffsetPagination(query, { page: 1, limit: 20 });
    const search = query.search ? sanitizeText(query.search) : undefined;

    const where: Prisma.CannedResponseWhereInput = {
      organizationId: orgId,
    };

    if (query.category) {
      where.category = {
        equals: sanitizeText(query.category),
        mode: "insensitive",
      };
    }

    if (search) {
      where.OR = [
        {
          shortcut: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          content: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.cannedResponse.count({ where }),
      prisma.cannedResponse.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: [{ createdAt: "desc" }],
      }),
    ]);

    return {
      data: items.map(toPayload),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  async create(userId: string, orgId: string, input: CreateCannedResponseInput): Promise<CannedResponsePayload> {
    await this.requireMembership(userId, orgId);
    const shortcut = normalizeShortcut(input.shortcut);

    const duplicate = await prisma.cannedResponse.findFirst({
      where: {
        organizationId: orgId,
        shortcut: {
          equals: shortcut,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictError("A canned response with this shortcut already exists");
    }

    const created = await prisma.cannedResponse.create({
      data: {
        organizationId: orgId,
        shortcut,
        title: sanitizeText(input.title),
        content: sanitizeText(input.content),
        category: input.category ? sanitizeText(input.category) : null,
      },
    });

    return toPayload(created);
  }

  async update(
    userId: string,
    orgId: string,
    id: string,
    input: UpdateCannedResponseInput,
  ): Promise<CannedResponsePayload> {
    await this.requireMembership(userId, orgId);
    await this.requireCannedResponse(orgId, id);

    const updateData: Prisma.CannedResponseUpdateInput = {};

    if (input.shortcut !== undefined) {
      const shortcut = normalizeShortcut(input.shortcut);
      const duplicate = await prisma.cannedResponse.findFirst({
        where: {
          organizationId: orgId,
          id: { not: id },
          shortcut: {
            equals: shortcut,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictError("A canned response with this shortcut already exists");
      }

      updateData.shortcut = shortcut;
    }

    if (input.title !== undefined) {
      updateData.title = sanitizeText(input.title);
    }

    if (input.content !== undefined) {
      updateData.content = sanitizeText(input.content);
    }

    if (input.category !== undefined) {
      updateData.category = input.category ? sanitizeText(input.category) : null;
    }

    const updated = await prisma.cannedResponse.update({
      where: { id },
      data: updateData,
    });

    return toPayload(updated);
  }

  async remove(userId: string, orgId: string, id: string): Promise<void> {
    await this.requireMembership(userId, orgId);
    await this.requireCannedResponse(orgId, id);

    await prisma.cannedResponse.delete({
      where: {
        id,
      },
    });
  }
}

export const cannedResponseService = new CannedResponseService();
