import type { CookieOptions, Request, Response } from "express";
import { UnauthorizedError } from "../../utils/errors";
import { authService } from "./auth.service";
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.validators";

const { accessTokenTtlMs, refreshTokenTtlMs } = authService.getCookieTtls();

const buildCookieOptions = (maxAge: number, httpOnly: boolean): CookieOptions => ({
  maxAge,
  httpOnly,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

const accessCookieOptions = buildCookieOptions(accessTokenTtlMs, true);
const refreshCookieOptions = buildCookieOptions(refreshTokenTtlMs, true);

const clearCookieOptions: CookieOptions = {
  ...buildCookieOptions(0, true),
  expires: new Date(0),
};

const getRequestContext = (req: Request): { userAgent?: string; ipAddress?: string } => {
  const context: { userAgent?: string; ipAddress?: string } = {};

  const userAgent = req.get("user-agent");
  if (userAgent) {
    context.userAgent = userAgent;
  }

  if (req.ip) {
    context.ipAddress = req.ip;
  }

  return context;
};

export class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    const payload = await authService.register(req.body as RegisterInput, getRequestContext(req));

    res.cookie("accessToken", payload.accessToken, accessCookieOptions);
    res.cookie("refreshToken", payload.refreshToken, refreshCookieOptions);

    res.status(201).json({ success: true, data: payload });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const payload = await authService.login(req.body as LoginInput, getRequestContext(req));

    res.cookie("accessToken", payload.accessToken, accessCookieOptions);
    res.cookie("refreshToken", payload.refreshToken, refreshCookieOptions);

    res.status(200).json({ success: true, data: payload });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const body = (req.body ?? {}) as RefreshInput;
    const refreshToken = body.refreshToken ?? req.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token is required");
    }

    const payload = await authService.refresh(refreshToken);

    res.cookie("accessToken", payload.accessToken, accessCookieOptions);
    res.cookie("refreshToken", payload.refreshToken, refreshCookieOptions);

    res.status(200).json({ success: true, data: payload });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const body = (req.body ?? {}) as LogoutInput;
    const refreshToken = body.refreshToken ?? req.cookies.refreshToken;

    await authService.logout(refreshToken);

    res.clearCookie("accessToken", clearCookieOptions);
    res.clearCookie("refreshToken", clearCookieOptions);

    res.status(200).json({ success: true, data: { message: "Logged out successfully" } });
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    await authService.forgotPassword(req.body as ForgotPasswordInput);

    res.status(200).json({
      success: true,
      data: { message: "If the email exists, a password reset link has been sent" },
    });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    await authService.resetPassword(req.body as ResetPasswordInput);

    res.status(200).json({ success: true, data: { message: "Password reset successfully" } });
  };

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    await authService.verifyEmail(req.body as VerifyEmailInput);

    res.status(200).json({ success: true, data: { message: "Email verified successfully" } });
  };

  resendVerification = async (req: Request, res: Response): Promise<void> => {
    await authService.resendVerification(req.body as ResendVerificationInput);

    res.status(200).json({
      success: true,
      data: { message: "If the account exists and is unverified, a verification email was sent" },
    });
  };
}

export const authController = new AuthController();
