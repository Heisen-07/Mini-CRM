// ============================================
// AI Routes
// POST /api/ai/message → generate campaign message
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { generateCampaignMessage } from "../ai/gemini.service";

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

export default router;