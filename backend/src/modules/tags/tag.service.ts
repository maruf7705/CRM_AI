import { prisma } from "../../config/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../utils/errors";
import { sanitizeText } from "../../utils/helpers";
import type { CreateTagInput, UpdateTagInput } from "./tag.validators";

interface TagResponse {
  id: string;
  name: string;
  color: string;
  contactCount: number;
}

const toTagResponse = (tag: {
  id: string;
  name: string;
  color: string;
  _count: { contacts: number };
}): TagResponse => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
  contactCount: tag._count.contacts,
});

export class TagService {
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

  private async requireTag(orgId: string, tagId: string) {
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        organizationId: orgId,
      },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundError("Tag");
    }

    return tag;
  }

  async listTags(userId: string, orgId: string): Promise<TagResponse[]> {
    await this.requireMembership(userId, orgId);

    const tags = await prisma.tag.findMany({
      where: {
        organizationId: orgId,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });

    return tags.map(toTagResponse);
  }

  async createTag(userId: string, orgId: string, input: CreateTagInput): Promise<TagResponse> {
    await this.requireMembership(userId, orgId);
    const normalizedName = sanitizeText(input.name);

    const duplicate = await prisma.tag.findFirst({
      where: {
        organizationId: orgId,
        name: {
          equals: normalizedName,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictError("A tag with this name already exists");
    }

    const created = await prisma.tag.create({
      data: {
        organizationId: orgId,
        name: normalizedName,
        color: input.color ?? "#6366f1",
      },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });

    return toTagResponse(created);
  }

  async updateTag(userId: string, orgId: string, tagId: string, input: UpdateTagInput): Promise<TagResponse> {
    await this.requireMembership(userId, orgId);
    await this.requireTag(orgId, tagId);

    const updateData: {
      name?: string;
      color?: string;
    } = {};

    if (input.name !== undefined) {
      const normalizedName = sanitizeText(input.name);
      const duplicate = await prisma.tag.findFirst({
        where: {
          organizationId: orgId,
          id: { not: tagId },
          name: {
            equals: normalizedName,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictError("A tag with this name already exists");
      }

      updateData.name = normalizedName;
    }

    if (input.color !== undefined) {
      updateData.color = input.color;
    }

    const updated = await prisma.tag.update({
      where: { id: tagId },
      data: updateData,
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });

    return toTagResponse(updated);
  }

  async deleteTag(userId: string, orgId: string, tagId: string): Promise<void> {
    await this.requireMembership(userId, orgId);
    await this.requireTag(orgId, tagId);

    await prisma.tag.delete({
      where: {
        id: tagId,
      },
    });
  }
}

export const tagService = new TagService();
