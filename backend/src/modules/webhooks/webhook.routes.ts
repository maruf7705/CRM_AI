import { Router, type NextFunction, type Request, type Response } from "express";
import { webhookController } from "./webhook.controller";

export const webhookRouter = Router();

const asyncHandler = (handler: (req: Request, res: Response) => Promise<void> | void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res)).catch(next);
  };
};

webhookRouter.get("/facebook", asyncHandler(webhookController.verify("FACEBOOK")));
webhookRouter.post("/facebook", asyncHandler(webhookController.receive("FACEBOOK")));

webhookRouter.get("/instagram", asyncHandler(webhookController.verify("INSTAGRAM")));
webhookRouter.post("/instagram", asyncHandler(webhookController.receive("INSTAGRAM")));

webhookRouter.get("/whatsapp", asyncHandler(webhookController.verify("WHATSAPP")));
webhookRouter.post("/whatsapp", asyncHandler(webhookController.receive("WHATSAPP")));

webhookRouter.post("/n8n-callback", asyncHandler(webhookController.n8nCallback));
