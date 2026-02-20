import { createHash, randomBytes } from "node:crypto";
import type { Organization, Role, User } from "@prisma/client";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { redis } from "../../config/redis";
import { comparePassword, hashPassword } from "../../utils/password";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../utils/errors";
import { sanitizeText, toSlug } from "../../utils/helpers";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/tokens";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.validators";

interface RequestContext {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

interface AuthUserPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  emailVerified: boolean;
}

interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUserPayload;
  org: {
    id: string;
    name: string;
    slug: string;
    role: Role;
  };
}

const LOGIN_ATTEMPT_LIMIT = 5;
const LOCKOUT_SECONDS = 30 * 60;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

const hashToken = (value: string): string => createHash("sha256").update(value).digest("hex");

const generateToken = (): string => randomBytes(32).toString("hex");

const parseDurationToMilliseconds = (value: string): number => {
  const match = /^(\d+)(ms|s|m|h|d)$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${value}`);
  }

  const amountRaw = match[1];
  const unitRaw = match[2];
  if (!amountRaw || !unitRaw) {
    throw new Error(`Invalid duration format: ${value}`);
  }

  const amount = Number.parseInt(amountRaw, 10);
  const unit = unitRaw.toLowerCase();

  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60_000;
    case "h":
      return amount * 3_600_000;
    case "d":
      return amount * 86_400_000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
};

const getPrimaryMembership = (
  user: User & {
    memberships: Array<{
      role: Role;
      organization: Organization;
    }>;
  },
): { role: Role; organization: Organization } => {
  const membership = user.memberships[0];
  if (!membership) {
    throw new UnauthorizedError("No organization membership found for this user");
  }

  return membership;
};

const buildAuthPayload = (
  user: User,
  organization: Organization,
  role: Role,
  accessToken: string,
  refreshToken: string,
): AuthPayload => {
  const userPayload: AuthUserPayload = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
  };

  if (user.avatar) {
    userPayload.avatar = user.avatar;
  }

  return {
    accessToken,
    refreshToken,
    user: userPayload,
    org: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role,
    },
  };
};

const maybeSendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  if (env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const failureBody = await response.text();
      logger.warn("Resend API email failed", { to, subject, status: response.status, failureBody });
    }

    return;
  }

  logger.info("Email fallback (no RESEND_API_KEY configured)", {
    to,
    subject,
    preview: html.slice(0, 160),
  });
};

const createSessionAndTokens = async (
  user: User,
  organizationId: string,
  role: Role,
  context: RequestContext,
  refreshTokenTtlMs: number,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const expiresAt = new Date(Date.now() + refreshTokenTtlMs);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: "pending",
      userAgent: context.userAgent ?? null,
      ipAddress: context.ipAddress ?? null,
      expiresAt,
    },
  });

  const refreshToken = signRefreshToken({
    userId: user.id,
    sessionId: session.id,
  });

  const accessToken = signAccessToken({
    userId: user.id,
    organizationId,
    role,
  });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: hashToken(refreshToken),
    },
  });

  return {
    accessToken,
    refreshToken,
  };
};

export class AuthService {
  private readonly accessTokenTtlMs: number;
  private readonly refreshTokenTtlMs: number;

  constructor() {
    this.accessTokenTtlMs = parseDurationToMilliseconds(env.JWT_ACCESS_EXPIRY);
    this.refreshTokenTtlMs = parseDurationToMilliseconds(env.JWT_REFRESH_EXPIRY);
  }

  getCookieTtls(): { accessTokenTtlMs: number; refreshTokenTtlMs: number } {
    return {
      accessTokenTtlMs: this.accessTokenTtlMs,
      refreshTokenTtlMs: this.refreshTokenTtlMs,
    };
  }

  private attemptsKey(email: string): string {
    return `auth:login:attempts:${email}`;
  }

  private lockKey(email: string): string {
    return `auth:login:lock:${email}`;
  }

  private async ensureNotLocked(email: string): Promise<void> {
    const isLocked = await redis.get<string>(this.lockKey(email));
    if (isLocked) {
      throw new UnauthorizedError("Account temporarily locked due to failed login attempts");
    }
  }

  private async trackFailedLogin(email: string): Promise<void> {
    const attempts = await redis.incr(this.attemptsKey(email));

    if (attempts === 1) {
      await redis.expire(this.attemptsKey(email), LOCKOUT_SECONDS);
    }

    if (attempts >= LOGIN_ATTEMPT_LIMIT) {
      await redis.set(this.lockKey(email), "1", { ex: LOCKOUT_SECONDS });
      await redis.del(this.attemptsKey(email));
    }
  }

  private async clearFailedLoginTracking(email: string): Promise<void> {
    await Promise.all([redis.del(this.attemptsKey(email)), redis.del(this.lockKey(email))]);
  }

  private async resolveUniqueOrganizationSlug(name: string): Promise<string> {
    const baseSlug = toSlug(name);
    let candidate = baseSlug;
    let counter = 1;

    while (await prisma.organization.findUnique({ where: { slug: candidate }, select: { id: true } })) {
      counter += 1;
      candidate = `${baseSlug}-${counter}`;
    }

    return candidate;
  }

  async register(input: RegisterInput, context: RequestContext): Promise<AuthPayload> {
    const email = input.email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const organizationName = sanitizeText(input.organizationName);
    const orgSlug = await this.resolveUniqueOrganizationSlug(organizationName);
    const verifyToken = generateToken();
    const verifyTokenHash = hashToken(verifyToken);
    const ownerRole: Role = "OWNER";

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: orgSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash: await hashPassword(input.password),
          firstName: sanitizeText(input.firstName),
          lastName: sanitizeText(input.lastName),
          verifyToken: verifyTokenHash,
          resetToken: null,
          resetTokenExp: null,
          emailVerified: false,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });

      await tx.orgMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: ownerRole,
          isOnline: false,
        },
      });

      return { user, organization };
    });

    const tokens = await createSessionAndTokens(
      result.user,
      result.organization.id,
      ownerRole,
      context,
      this.refreshTokenTtlMs,
    );

    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(verifyToken)}&email=${encodeURIComponent(
      email,
    )}`;

    await maybeSendEmail(
      email,
      "Verify your OmniDesk AI account",
      `<p>Welcome to OmniDesk AI.</p><p>Verify your email by clicking <a href="${verifyUrl}">this link</a>.</p>`,
    );

    return buildAuthPayload(result.user, result.organization, ownerRole, tokens.accessToken, tokens.refreshToken);
  }

  async login(input: LoginInput, context: RequestContext): Promise<AuthPayload> {
    const email = input.email.toLowerCase();

    await this.ensureNotLocked(email);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
        },
      },
    });

    if (!user || !user.isActive) {
      await this.trackFailedLogin(email);
      throw new UnauthorizedError("Invalid email or password");
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      await this.trackFailedLogin(email);
      throw new UnauthorizedError("Invalid email or password");
    }

    await this.clearFailedLoginTracking(email);

    const membership = getPrimaryMembership(user);

    const tokens = await createSessionAndTokens(
      user,
      membership.organization.id,
      membership.role,
      context,
      this.refreshTokenTtlMs,
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return buildAuthPayload(user, membership.organization, membership.role, tokens.accessToken, tokens.refreshToken);
  }

  async refresh(refreshToken: string): Promise<AuthPayload> {
    const decoded = verifyRefreshToken(refreshToken);
    const hashedRefreshToken = hashToken(refreshToken);

    const session = await prisma.session.findFirst({
      where: {
        id: decoded.sessionId,
        userId: decoded.userId,
      },
    });

    if (!session) {
      throw new UnauthorizedError("Invalid refresh session");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedError("Refresh session expired");
    }

    if (session.refreshToken !== hashedRefreshToken) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedError("Refresh token mismatch");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError("User account is inactive");
    }

    const membership = getPrimaryMembership(user);

    const newRefreshToken = signRefreshToken({
      userId: user.id,
      sessionId: session.id,
    });

    const newAccessToken = signAccessToken({
      userId: user.id,
      organizationId: membership.organization.id,
      role: membership.role,
    });

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
      },
    });

    return buildAuthPayload(user, membership.organization, membership.role, newAccessToken, newRefreshToken);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      await prisma.session.deleteMany({
        where: {
          id: decoded.sessionId,
          userId: decoded.userId,
        },
      });
    } catch {
      return;
    }
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const email = input.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return;
    }

    const resetToken = generateToken();
    const resetTokenHash = hashToken(resetToken);
    const resetTokenExp = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExp,
      },
    });

    const resetUrl = `${env.FRONTEND_URL}/login?resetToken=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(
      email,
    )}`;

    await maybeSendEmail(
      email,
      "Reset your OmniDesk AI password",
      `<p>You requested a password reset.</p><p>Reset your password via <a href="${resetUrl}">this link</a>.</p>`,
    );
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const resetTokenHash = hashToken(input.token);

    const user = await prisma.user.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExp: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Valid reset token");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(input.password),
          resetToken: null,
          resetTokenExp: null,
        },
      }),
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);
  }

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const verifyTokenHash = hashToken(input.token);

    const user = await prisma.user.findFirst({
      where: {
        verifyToken: verifyTokenHash,
      },
    });

    if (!user) {
      throw new NotFoundError("Verification token");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
      },
    });
  }

  async resendVerification(input: ResendVerificationInput): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.emailVerified) {
      return;
    }

    const verifyToken = generateToken();
    const verifyTokenHash = hashToken(verifyToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: verifyTokenHash,
      },
    });

    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(verifyToken)}&email=${encodeURIComponent(
      user.email,
    )}`;

    await maybeSendEmail(
      user.email,
      "Verify your OmniDesk AI account",
      `<p>Please verify your email by clicking <a href="${verifyUrl}">this link</a>.</p>`,
    );
  }
}

export const authService = new AuthService();
