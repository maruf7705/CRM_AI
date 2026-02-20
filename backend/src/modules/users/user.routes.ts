import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { userController } from "./user.controller";
import { changePasswordSchema, updateMeSchema } from "./user.validators";

const asyncHandler = (
  handler: (req: Request, res: Response) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get("/me", asyncHandler(userController.getMe));
userRouter.patch("/me", validatorMiddleware({ body: updateMeSchema }), asyncHandler(userController.updateMe));
userRouter.patch(
  "/me/password",
  validatorMiddleware({ body: changePasswordSchema }),
  asyncHandler(userController.changePassword),
);
userRouter.post("/me/avatar", upload.single("avatar"), asyncHandler(userController.uploadAvatar));
