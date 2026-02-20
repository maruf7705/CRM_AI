import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/tokens";
import { UnauthorizedError } from "../utils/errors";

const parseBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const resolveAccessToken = (req: Request): string | null => {
  const bearer = parseBearerToken(req.headers.authorization);
  if (bearer) {
    return bearer;
  }

  const cookieToken = req.cookies.accessToken as string | undefined;
  return cookieToken ?? null;
};

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const token = resolveAccessToken(req);
  if (!token) {
    next(new UnauthorizedError());
    return;
  }

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
};
