import type { User } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { supabaseAdmin } from "../../config/supabase-admin";
import { comparePassword, hashPassword } from "../../utils/password";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../utils/errors";
import { sanitizeText } from "../../utils/helpers";
import type { ChangePasswordInput, UpdateMeInput } from "./user.validators";

interface AvatarUploadInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  size: number;
}

interface MePayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  emailVerified: boolean;
}

const toMePayload = (user: User): MePayload => {
  const payload: MePayload = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
  };

  if (user.phone) {
    payload.phone = user.phone;
  }

  if (user.avatar) {
    payload.avatar = user.avatar;
  }

  return payload;
};

const AVATAR_BUCKET = "avatars";
let avatarBucketReady = false;

export class UserService {
  private async ensureAvatarBucket(): Promise<void> {
    if (avatarBucketReady) {
      return;
    }

    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) {
      throw new BadRequestError("Unable to verify avatar bucket", error.message);
    }

    const exists = buckets.some((bucket) => bucket.name === AVATAR_BUCKET);
    if (!exists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
      });

      if (createError) {
        throw new BadRequestError("Unable to create avatar bucket", createError.message);
      }
    }

    avatarBucketReady = true;
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User");
    }

    return user;
  }

  async getMe(userId: string): Promise<MePayload> {
    const user = await this.getUserById(userId);
    return toMePayload(user);
  }

  async updateMe(userId: string, input: UpdateMeInput): Promise<MePayload> {
    await this.getUserById(userId);

    const updateData: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      avatar?: string | null;
    } = {};

    if (typeof input.firstName === "string") {
      updateData.firstName = sanitizeText(input.firstName);
    }

    if (typeof input.lastName === "string") {
      updateData.lastName = sanitizeText(input.lastName);
    }

    if (input.phone !== undefined) {
      updateData.phone = input.phone ? sanitizeText(input.phone) : null;
    }

    if (input.avatar !== undefined) {
      updateData.avatar = input.avatar;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return toMePayload(user);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.getUserById(userId);

    const passwordMatches = await comparePassword(input.currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    if (input.currentPassword === input.newPassword) {
      throw new BadRequestError("New password must be different from current password");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: await hashPassword(input.newPassword),
        },
      }),
      prisma.session.deleteMany({
        where: {
          userId,
        },
      }),
    ]);
  }

  async uploadAvatar(userId: string, input: AvatarUploadInput): Promise<{ avatarUrl: string }> {
    if (!input.mimeType.startsWith("image/")) {
      throw new BadRequestError("Avatar must be an image file");
    }

    if (input.size > 5 * 1024 * 1024) {
      throw new BadRequestError("Avatar file size must not exceed 5MB");
    }

    await this.getUserById(userId);
    await this.ensureAvatarBucket();

    const extension = input.originalName.includes(".")
      ? input.originalName.split(".").pop()?.toLowerCase() ?? "png"
      : "png";

    const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

    const upload = await supabaseAdmin.storage.from(AVATAR_BUCKET).upload(filePath, input.buffer, {
      contentType: input.mimeType,
      upsert: true,
    });

    if (upload.error) {
      throw new BadRequestError("Failed to upload avatar", upload.error.message);
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

    await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: publicUrl,
      },
    });

    return { avatarUrl: publicUrl };
  }
}

export const userService = new UserService();
