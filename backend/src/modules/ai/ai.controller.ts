import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { aiService } from "./ai.service";
import { createTrainingDocBodySchema } from "./ai.validators";
import type { AiTestInput, UpdateAiSettingsInput } from "./ai.validators";

const requireActorId = (req: Request): string => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
};

const requireOrgId = (req: Request): string => {
  const orgId = req.params.orgId;
  if (!orgId) {
    throw new BadRequestError("Organization id is required");
  }

  return orgId;
};

const requireDocId = (req: Request): string => {
  const docId = req.params.id;
  if (!docId) {
    throw new BadRequestError("Training document id is required");
  }

  return docId;
};

export class AiController {
  getSettings = async (req: Request, res: Response): Promise<void> => {
    const data = await aiService.getSettings(requireActorId(req), requireOrgId(req));
    res.status(200).json({ success: true, data });
  };

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    const data = await aiService.updateSettings(
      requireActorId(req),
      requireOrgId(req),
      req.body as UpdateAiSettingsInput,
    );

    res.status(200).json({ success: true, data });
  };

  listTrainingDocs = async (req: Request, res: Response): Promise<void> => {
    const data = await aiService.listTrainingDocs(requireActorId(req), requireOrgId(req));
    res.status(200).json({ success: true, data });
  };

  createTrainingDoc = async (req: Request, res: Response): Promise<void> => {
    const parsed = createTrainingDocBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError("Validation failed", parsed.error.flatten());
    }

    const file = req.file
      ? {
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
          size: req.file.size,
        }
      : undefined;

    const data = await aiService.createTrainingDoc(
      requireActorId(req),
      requireOrgId(req),
      parsed.data,
      file,
    );

    res.status(201).json({ success: true, data });
  };

  deleteTrainingDoc = async (req: Request, res: Response): Promise<void> => {
    await aiService.deleteTrainingDoc(requireActorId(req), requireOrgId(req), requireDocId(req));
    res.status(200).json({ success: true, data: { message: "Training document deleted" } });
  };

  testAi = async (req: Request, res: Response): Promise<void> => {
    const data = await aiService.testAi(requireActorId(req), requireOrgId(req), req.body as AiTestInput);
    res.status(200).json({ success: true, data });
  };
}

export const aiController = new AiController();

