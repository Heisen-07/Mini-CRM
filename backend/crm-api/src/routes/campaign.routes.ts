// ============================================
// Campaign Routes
// GET  /api/campaigns  → list all campaigns
// POST /api/campaigns  → create new campaign
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { getAllCampaigns, createCampaign } from "../services/campaign.service";

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

export default router;