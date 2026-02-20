import { randomBytes } from "node:crypto";
import type { Organization, OrgMember, Role, User } from "@prisma/client";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { hashPassword } from "../../utils/password";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../utils/errors";
import { sanitizeText, toSlug } from "../../utils/helpers";
import type { InviteMemberInput, UpdateMemberInput, UpdateOrgInput } from "./org.validators";

interface MembershipWithUserAndOrg extends OrgMember {
  user: User;
  organization: Organization;
}

interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: string;
  maxAgents: number;
  maxChannels: number;
  aiEnabled: boolean;
  aiMode: string;
  aiSystemPrompt?: string;
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  n8nWebhookUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  currentUserRole: Role;
}

interface OrgMemberResponse {
  id: string;
  role: Role;
  isOnline: boolean;
  maxConcurrent: number;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    emailVerified: boolean;
    isActive: boolean;
  };
}

const MANAGE_ROLES: readonly Role[] = ["OWNER", "ADMIN"] as const;

const canManageMembers = (role: Role): boolean => MANAGE_ROLES.includes(role);

const buildMemberResponse = (membership: OrgMember & { user: User }): OrgMemberResponse => {
  const payload: OrgMemberResponse = {
    id: membership.id,
    role: membership.role,
    isOnline: membership.isOnline,
    maxConcurrent: membership.maxConcurrent,
    createdAt: membership.createdAt,
    user: {
      id: membership.user.id,
      email: membership.user.email,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      emailVerified: membership.user.emailVerified,
      isActive: membership.user.isActive,
    },
  };

  if (membership.user.avatar) {
    payload.user.avatar = membership.user.avatar;
  }

  return payload;
};

const maybeSendInviteEmail = async (
  email: string,
  organizationName: string,
  role: Role,
  temporaryPassword?: string,
): Promise<void> => {
  const subject = `Invitation to ${organizationName} on OmniDesk AI`;
  const html = temporaryPassword
    ? `<p>You were invited to ${organizationName} as ${role}.</p><p>Temporary password: <strong>${temporaryPassword}</strong></p><p>Sign in at ${env.FRONTEND_URL}/login and update your password.</p>`
    : `<p>You were invited to ${organizationName} as ${role}.</p><p>Sign in at ${env.FRONTEND_URL}/login to accept your invitation.</p>`;

  if (env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: email,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.warn("Invite email failed", { email, status: response.status, body });
    }

    return;
  }

  logger.info("Invite email fallback (RESEND_API_KEY missing)", {
    email,
    organizationName,
    role,
    temporaryPasswordIncluded: Boolean(temporaryPassword),
  });
};

export class OrgService {
  private async requireMembership(userId: string, orgId: string): Promise<MembershipWithUserAndOrg> {
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
      include: {
        user: true,
        organization: true,
      },
    });

    if (!membership) {
      throw new ForbiddenError("You do not have access to this organization");
    }

    return membership;
  }

  private async assertCanManageMembers(userId: string, orgId: string): Promise<MembershipWithUserAndOrg> {
    const membership = await this.requireMembership(userId, orgId);

    if (!canManageMembers(membership.role)) {
      throw new ForbiddenError("Only admins and owners can manage members");
    }

    return membership;
  }

  private async ensureUniqueSlug(base: string, orgId: string): Promise<string> {
    let candidate = base;
    let counter = 1;

    while (
      await prisma.organization.findFirst({
        where: {
          slug: candidate,
          id: { not: orgId },
        },
        select: { id: true },
      })
    ) {
      counter += 1;
      candidate = `${base}-${counter}`;
    }

    return candidate;
  }

  private async countAgentLikeMembers(orgId: string): Promise<number> {
    return prisma.orgMember.count({
      where: {
        organizationId: orgId,
        role: {
          in: ["OWNER", "ADMIN", "AGENT"],
        },
      },
    });
  }

  private async enforceMaxAgents(org: Organization, nextRole: Role): Promise<void> {
    if (nextRole === "VIEWER") {
      return;
    }

    const current = await this.countAgentLikeMembers(org.id);
    if (current >= org.maxAgents) {
      throw new BadRequestError(`Organization has reached max agent limit (${org.maxAgents})`);
    }
  }

  async getOrganization(userId: string, orgId: string): Promise<OrganizationResponse> {
    const membership = await this.requireMembership(userId, orgId);
    const memberCount = await prisma.orgMember.count({ where: { organizationId: orgId } });

    const payload: OrganizationResponse = {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      plan: membership.organization.plan,
      maxAgents: membership.organization.maxAgents,
      maxChannels: membership.organization.maxChannels,
      aiEnabled: membership.organization.aiEnabled,
      aiMode: membership.organization.aiMode,
      aiModel: membership.organization.aiModel,
      aiTemperature: membership.organization.aiTemperature,
      aiMaxTokens: membership.organization.aiMaxTokens,
      createdAt: membership.organization.createdAt,
      updatedAt: membership.organization.updatedAt,
      memberCount,
      currentUserRole: membership.role,
    };

    if (membership.organization.logo) {
      payload.logo = membership.organization.logo;
    }

    if (membership.organization.aiSystemPrompt) {
      payload.aiSystemPrompt = membership.organization.aiSystemPrompt;
    }

    if (membership.organization.n8nWebhookUrl) {
      payload.n8nWebhookUrl = membership.organization.n8nWebhookUrl;
    }

    return payload;
  }

  async updateOrganization(userId: string, orgId: string, input: UpdateOrgInput): Promise<OrganizationResponse> {
    const membership = await this.requireMembership(userId, orgId);
    if (!canManageMembers(membership.role)) {
      throw new ForbiddenError("Only admins and owners can update organization settings");
    }

    const updateData: {
      name?: string;
      slug?: string;
      logo?: string | null;
      plan?: Organization["plan"];
      maxAgents?: number;
      maxChannels?: number;
      aiEnabled?: boolean;
      aiMode?: Organization["aiMode"];
      aiSystemPrompt?: string | null;
      aiModel?: string;
      aiTemperature?: number;
      aiMaxTokens?: number;
      n8nWebhookUrl?: string | null;
    } = {};

    if (typeof input.name === "string") {
      const cleanedName = sanitizeText(input.name);
      updateData.name = cleanedName;
      updateData.slug = await this.ensureUniqueSlug(toSlug(cleanedName), orgId);
    }

    if (input.logo !== undefined) {
      updateData.logo = input.logo;
    }

    if (input.plan !== undefined) {
      if (membership.role !== "OWNER") {
        throw new ForbiddenError("Only owners can change organization plan");
      }
      updateData.plan = input.plan;
    }

    if (input.maxAgents !== undefined) {
      updateData.maxAgents = input.maxAgents;
    }

    if (input.maxChannels !== undefined) {
      updateData.maxChannels = input.maxChannels;
    }

    if (input.aiEnabled !== undefined) {
      updateData.aiEnabled = input.aiEnabled;
    }

    if (input.aiMode !== undefined) {
      updateData.aiMode = input.aiMode;
    }

    if (input.aiSystemPrompt !== undefined) {
      updateData.aiSystemPrompt = input.aiSystemPrompt ? sanitizeText(input.aiSystemPrompt) : null;
    }

    if (input.aiModel !== undefined) {
      updateData.aiModel = sanitizeText(input.aiModel);
    }

    if (input.aiTemperature !== undefined) {
      updateData.aiTemperature = input.aiTemperature;
    }

    if (input.aiMaxTokens !== undefined) {
      updateData.aiMaxTokens = input.aiMaxTokens;
    }

    if (input.n8nWebhookUrl !== undefined) {
      updateData.n8nWebhookUrl = input.n8nWebhookUrl;
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return this.getOrganization(userId, orgId);
  }

  async listMembers(userId: string, orgId: string): Promise<OrgMemberResponse[]> {
    await this.requireMembership(userId, orgId);

    const members = await prisma.orgMember.findMany({
      where: {
        organizationId: orgId,
      },
      include: {
        user: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    return members.map(buildMemberResponse);
  }

  async inviteMember(userId: string, orgId: string, input: InviteMemberInput): Promise<OrgMemberResponse> {
    const actorMembership = await this.assertCanManageMembers(userId, orgId);
    const organization = actorMembership.organization;

    const email = input.email.toLowerCase();

    let createdMembershipId = "";
    let temporaryPassword: string | undefined;

    await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email } });

      if (existingUser) {
        const existingMembership = await tx.orgMember.findUnique({
          where: {
            userId_organizationId: {
              userId: existingUser.id,
              organizationId: orgId,
            },
          },
        });

        if (existingMembership) {
          throw new ConflictError("User is already a member of this organization");
        }

        await this.enforceMaxAgents(organization, input.role);

        const membership = await tx.orgMember.create({
          data: {
            organizationId: orgId,
            userId: existingUser.id,
            role: input.role,
            isOnline: false,
          },
          include: {
            user: true,
          },
        });

        createdMembershipId = membership.id;
        return;
      }

      await this.enforceMaxAgents(organization, input.role);

      const firstName = input.firstName ? sanitizeText(input.firstName) : "Invited";
      const lastName = input.lastName ? sanitizeText(input.lastName) : "Member";

      temporaryPassword = `Temp#${randomBytes(8).toString("hex")}Aa1`;

      const createdUser = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash: await hashPassword(temporaryPassword),
          emailVerified: false,
          isActive: true,
          verifyToken: randomBytes(24).toString("hex"),
        },
      });

      const membership = await tx.orgMember.create({
        data: {
          organizationId: orgId,
          userId: createdUser.id,
          role: input.role,
          isOnline: false,
        },
      });

      createdMembershipId = membership.id;
    });

    await maybeSendInviteEmail(email, organization.name, input.role, temporaryPassword);

    const createdMembership = await prisma.orgMember.findFirst({
      where: {
        id: createdMembershipId,
        organizationId: orgId,
      },
      include: {
        user: true,
      },
    });

    if (!createdMembership) {
      throw new NotFoundError("Invited member");
    }

    return buildMemberResponse(createdMembership);
  }

  async updateMember(
    userId: string,
    orgId: string,
    memberId: string,
    input: UpdateMemberInput,
  ): Promise<OrgMemberResponse> {
    const actorMembership = await this.assertCanManageMembers(userId, orgId);

    const targetMembership = await prisma.orgMember.findFirst({
      where: {
        id: memberId,
        organizationId: orgId,
      },
      include: {
        user: true,
      },
    });

    if (!targetMembership) {
      throw new NotFoundError("Organization member");
    }

    if (targetMembership.role === "OWNER" && actorMembership.role !== "OWNER") {
      throw new ForbiddenError("Only owners can modify owner memberships");
    }

    if (input.role === "OWNER" && actorMembership.role !== "OWNER") {
      throw new ForbiddenError("Only owners can promote members to owner");
    }

    if (
      targetMembership.userId === actorMembership.userId &&
      input.role !== undefined &&
      input.role !== actorMembership.role
    ) {
      throw new BadRequestError("You cannot change your own role");
    }

    if (targetMembership.role === "OWNER" && input.role && input.role !== "OWNER") {
      const ownerCount = await prisma.orgMember.count({
        where: {
          organizationId: orgId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestError("Organization must have at least one owner");
      }
    }

    const updateData: {
      role?: Role;
      isOnline?: boolean;
      maxConcurrent?: number;
    } = {};

    if (input.role !== undefined) {
      if (input.role !== targetMembership.role && input.role !== "VIEWER") {
        await this.enforceMaxAgents(actorMembership.organization, input.role);
      }
      updateData.role = input.role;
    }

    if (input.isOnline !== undefined) {
      updateData.isOnline = input.isOnline;
    }

    if (input.maxConcurrent !== undefined) {
      updateData.maxConcurrent = input.maxConcurrent;
    }

    const updated = await prisma.orgMember.update({
      where: { id: memberId },
      data: updateData,
      include: { user: true },
    });

    return buildMemberResponse(updated);
  }

  async removeMember(userId: string, orgId: string, memberId: string): Promise<void> {
    const actorMembership = await this.assertCanManageMembers(userId, orgId);

    const targetMembership = await prisma.orgMember.findFirst({
      where: {
        id: memberId,
        organizationId: orgId,
      },
    });

    if (!targetMembership) {
      throw new NotFoundError("Organization member");
    }

    if (targetMembership.userId === actorMembership.userId) {
      throw new BadRequestError("You cannot remove yourself from the organization");
    }

    if (targetMembership.role === "OWNER") {
      if (actorMembership.role !== "OWNER") {
        throw new ForbiddenError("Only owners can remove owners");
      }

      const ownerCount = await prisma.orgMember.count({
        where: {
          organizationId: orgId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestError("Organization must have at least one owner");
      }
    }

    await prisma.orgMember.delete({
      where: {
        id: memberId,
      },
    });
  }
}

export const orgService = new OrgService();
