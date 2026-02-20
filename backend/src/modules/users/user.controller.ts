import type { Request, Response } from "express";
import { UnauthorizedError, BadRequestError } from "../../utils/errors";
import { userService } from "./user.service";
import type { ChangePasswordInput, UpdateMeInput } from "./user.validators";

const requireUserId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
};

export class UserController {
  getMe = async (req: Request, res: Response): Promise<void> => {
    const user = await userService.getMe(requireUserId(req));
    res.status(200).json({ success: true, data: user });
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    const user = await userService.updateMe(requireUserId(req), req.body as UpdateMeInput);
    res.status(200).json({ success: true, data: user });
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    await userService.changePassword(requireUserId(req), req.body as ChangePasswordInput);
    res.status(200).json({ success: true, data: { message: "Password updated successfully" } });
  };

  uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw new BadRequestError("Avatar file is required");
    }

    const result = await userService.uploadAvatar(requireUserId(req), {
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      size: req.file.size,
    });

    res.status(200).json({ success: true, data: result });
  };
}

export const userController = new UserController();
