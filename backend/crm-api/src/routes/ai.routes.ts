// ============================================
// AI Routes
// POST /api/ai/message   → generate campaign message
// POST /api/ai/segment   → AI audience segmentation
// POST /api/ai/campaign  → AI campaign builder
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { generateCampaignMessage, segmentCustomers, generateCampaignPlan } from "../ai/gemini.service";
import { getCustomersByFilter } from "../services/customer.service";
import { createCampaign } from "../services/campaign.service";

const router = Router();

// Generate campaign message using Gemini
router.post("/message", async (req: Request, res: Response) => {
  try {
    const { goal, channel, offer } = req.body;

    if (!goal || !channel || !offer) {
      sendError(res, "goal, channel, and offer are required", 400);
      return;
    }

    const message = await generateCampaignMessage({ goal, channel, offer });

    sendSuccess(res, {
      data: { message },
    });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    sendError(res, "AI service unavailable", 503);
  }
});

// AI-powered audience segmentation
router.post("/segment", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      sendError(res, "query is required and must be a string", 400);
      return;
    }

    // Step 1: Gemini converts natural language → structured filter
    const filter = await segmentCustomers(query);
    console.log("[SEGMENT] Gemini filter:", JSON.stringify(filter));

    // Step 2: Prisma executes the filter
    const customers = await getCustomersByFilter(filter);

    sendSuccess(res, {
      count: customers.length,
      filter,
      data: customers,
    });
  } catch (error: any) {
    console.error("[SEGMENT] Error:", error.message || error);

    // JSON parse errors or unsupported queries → 400
    if (error instanceof SyntaxError || error.message?.includes("Unsupported") || error.message?.includes("unsupported")) {
      sendError(res, error.message || "Invalid query", 400);
      return;
    }

    sendError(res, "AI segmentation unavailable", 503);
  }
});

// AI-powered campaign builder
router.post("/campaign", async (req: Request, res: Response) => {
  try {
    const { goal } = req.body;

    if (!goal || typeof goal !== "string") {
      sendError(res, "goal is required and must be a string", 400);
      return;
    }

    // Step 1: Gemini generates campaign plan
    const generated = await generateCampaignPlan(goal);
    console.log("[AI-CAMPAIGN] Generated:", JSON.stringify(generated));

    // Step 2: Save campaign as draft
    const campaign = await createCampaign({
      name: generated.campaignName,
      goal,
      channel: generated.channel,
      message: generated.message,
    });
    console.log("[AI-CAMPAIGN] Saved:", campaign.id);

    sendSuccess(res, {
      campaign,
      generated,
    }, 201);
  } catch (error: any) {
    console.error("[AI-CAMPAIGN] Error:", error.message || error);

    if (error instanceof SyntaxError) {
      sendError(res, "AI returned malformed response", 500);
      return;
    }

    sendError(res, "AI campaign builder unavailable", 503);
  }
});

export default router;