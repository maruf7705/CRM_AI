import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../utils/errors";
import { analyticsService } from "./analytics.service";
import type { AnalyticsRangeQuery } from "./analytics.validators";

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

export class AnalyticsController {
  getOverview = async (req: Request, res: Response): Promise<void> => {
    const data = await analyticsService.getOverview(
      requireActorId(req),
      requireOrgId(req),
      req.query as AnalyticsRangeQuery,
    );

    res.status(200).json({ success: true, data });
  };

  getAgents = async (req: Request, res: Response): Promise<void> => {
    const data = await analyticsService.getAgents(
      requireActorId(req),
      requireOrgId(req),
      req.query as AnalyticsRangeQuery,
    );

    res.status(200).json({ success: true, data });
  };

  getChannels = async (req: Request, res: Response): Promise<void> => {
    const data = await analyticsService.getChannels(
      requireActorId(req),
      requireOrgId(req),
      req.query as AnalyticsRangeQuery,
    );

    res.status(200).json({ success: true, data });
  };

  getAi = async (req: Request, res: Response): Promise<void> => {
    const data = await analyticsService.getAi(
      requireActorId(req),
      requireOrgId(req),
      req.query as AnalyticsRangeQuery,
    );

    res.status(200).json({ success: true, data });
  };
}

export const analyticsController = new AnalyticsController();

