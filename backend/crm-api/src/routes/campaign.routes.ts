// ============================================
// Campaign Routes
// GET  /api/campaigns            → list all campaigns
// GET  /api/campaigns/:id        → campaign details + performance
// POST /api/campaigns            → create new campaign
// PUT  /api/campaigns/:id        → update campaign message
// POST /api/campaigns/:id/launch → launch campaign
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import {
  getAllCampaigns,
  createCampaign,
  launchCampaign,
  getCampaignWithPerformance,
  updateCampaignMessage,
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

// Get campaign details with performance
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await getCampaignWithPerformance(req.params.id as string);

    if ("error" in result) {
      sendError(res, result.error as string, result.status as number);
      return;
    }

    sendSuccess(res, {
      campaign: result.campaign,
      performance: result.performance,
    });
  } catch (error) {
    sendError(res, "Failed to fetch campaign details");
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

// Update campaign message (draft only)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      sendError(res, "message is required and must be a string", 400);
      return;
    }

    const result = await updateCampaignMessage(req.params.id as string, message);

    if ("error" in result) {
      sendError(res, result.error as string, result.status as number);
      return;
    }

    sendSuccess(res, { data: result.campaign });
  } catch (error) {
    sendError(res, "Failed to update campaign");
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