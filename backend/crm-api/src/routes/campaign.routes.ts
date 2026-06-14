// ============================================
// Campaign Routes
// GET  /api/campaigns                    → list all campaigns
// GET  /api/campaigns/:id                → details + performance + cached analysis
// POST /api/campaigns                    → create new campaign
// PUT  /api/campaigns/:id                → update campaign message
// POST /api/campaigns/:id/launch         → launch campaign
// POST /api/campaigns/:id/refresh-analysis → regenerate AI analysis
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import {
  getAllCampaigns,
  createCampaign,
  launchCampaign,
  getCampaignWithPerformance,
  updateCampaignMessage,
  getCachedAnalysis,
  setCachedAnalysis,
} from "../services/campaign.service";
import { generateCampaignAnalysis } from "../ai/gemini.service";

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

    const analysis = await getCachedAnalysis(req.params.id as string);

    sendSuccess(res, {
      campaign: result.campaign,
      performance: result.performance,
      analysis: analysis,
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

// Refresh campaign AI analysis (only endpoint that calls Gemini for campaigns)
router.post("/:id/refresh-analysis", async (req: Request, res: Response) => {
  try {
    const result = await getCampaignWithPerformance(req.params.id as string);

    if ("error" in result) {
      sendError(res, result.error as string, result.status as number);
      return;
    }

    if (!result.performance) {
      sendError(res, "Analysis not available for draft campaigns", 400);
      return;
    }

    // Check if performance changed
    const currentSnapshot = JSON.stringify(result.performance);
    const existingAnalysis = await getCachedAnalysis(req.params.id as string);
    if (existingAnalysis && existingAnalysis.snapshot === currentSnapshot) {
      console.log(`[CAMPAIGN] Refresh blocked (performance_unchanged) for ${req.params.id}`);
      sendSuccess(res, {
        insights: existingAnalysis.insights,
        cached: true,
        reason: "performance_unchanged",
        generatedAt: existingAnalysis.generatedAt,
      });
      return;
    }

    const insights = await generateCampaignAnalysis({
      name: result.campaign.name,
      channel: result.campaign.channel,
      message: result.campaign.message,
      audienceSize: result.campaign.audienceSize,
      ...result.performance,
    });

    await setCachedAnalysis(req.params.id as string, insights, currentSnapshot);
    console.log(`[CAMPAIGN] AI analysis refreshed for ${req.params.id}`);

    sendSuccess(res, {
      insights,
      cached: false,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    sendError(res, "Failed to generate campaign analysis");
  }
});

export default router;