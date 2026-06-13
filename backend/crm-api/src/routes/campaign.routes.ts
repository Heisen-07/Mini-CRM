// ============================================
// Campaign Routes
// GET  /api/campaigns        → list all campaigns
// POST /api/campaigns        → create new campaign
// POST /api/campaigns/:id/launch → launch campaign
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import {
  getAllCampaigns,
  createCampaign,
  launchCampaign,
} from "../services/campaign.service";

const router = Router();

// Get all campaigns
router.get("/", async (_req: Request, res: Response) => {
  try {
    const campaigns = await getAllCampaigns();
    sendSuccess(res, {
      count: campaigns.length,
      data: campaigns,
    });
  } catch (error) {
    sendError(res, "Failed to fetch campaigns");
  }
});

// Create campaign
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, goal, channel, message } = req.body;

    if (!name) {
      sendError(res, "Campaign name is required", 400);
      return;
    }

    const campaign = await createCampaign({ name, goal, channel, message });
    sendSuccess(res, { data: campaign }, 201);
  } catch (error) {
    sendError(res, "Failed to create campaign");
  }
});

// Launch campaign
router.post("/:id/launch", async (req: Request, res: Response) => {
  try {
    const result = await launchCampaign(req.params.id as string);

    if ("error" in result) {
      sendError(res, result.error as string, result.status as number);
      return;
    }

    sendSuccess(res, {
      data: result.campaign,
      communicationsCreated: result.communicationsCreated,
    });
  } catch (error) {
    sendError(res, "Failed to launch campaign");
  }
});

export default router;