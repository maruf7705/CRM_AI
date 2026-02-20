import { Router, type NextFunction, type Request, type Response } from "express";
import { authRateLimiter } from "../../middleware/rateLimiter.middleware";
import { validatorMiddleware } from "../../middleware/validator.middleware";
import { authController } from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validators";

const asyncHandler = (
  handler: (req: Request, res: Response) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
};

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validatorMiddleware({ body: registerSchema }), asyncHandler(authController.register));
authRouter.post("/login", authRateLimiter, validatorMiddleware({ body: loginSchema }), asyncHandler(authController.login));
authRouter.post("/refresh", validatorMiddleware({ body: refreshSchema }), asyncHandler(authController.refresh));
authRouter.post("/logout", validatorMiddleware({ body: logoutSchema }), asyncHandler(authController.logout));
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validatorMiddleware({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword),
);
authRouter.post(
  "/reset-password",
  authRateLimiter,
  validatorMiddleware({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
);
authRouter.post(
  "/verify-email",
  authRateLimiter,
  validatorMiddleware({ body: verifyEmailSchema }),
  asyncHandler(authController.verifyEmail),
);
authRouter.post(
  "/resend-verification",
  authRateLimiter,
  validatorMiddleware({ body: resendVerificationSchema }),
  asyncHandler(authController.resendVerification),
);
