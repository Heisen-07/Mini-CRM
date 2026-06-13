// ============================================
// AI Routes
// POST /api/ai/message  → generate campaign message
// POST /api/ai/segment  → AI audience segmentation
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { generateCampaignMessage, segmentCustomers } from "../ai/gemini.service";
import { getCustomersByFilter } from "../services/customer.service";

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

export default router;