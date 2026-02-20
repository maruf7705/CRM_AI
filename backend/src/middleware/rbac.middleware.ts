import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";

export const rbacMiddleware = (allowedRoles: readonly string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.auth?.role;

    if (!role) {
      next(new UnauthorizedError());
      return;
    }

    if (!allowedRoles.includes(role)) {
      next(new ForbiddenError());
      return;
    }

    next();
  };
};
