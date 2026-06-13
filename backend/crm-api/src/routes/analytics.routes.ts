// ============================================
// Analytics Routes
// GET /api/analytics/summary → AI business insights
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { getAnalyticsMetrics } from "../services/analytics.service";
import { generateBusinessInsights } from "../ai/gemini.service";

const router = Router();

// GET /summary — aggregated metrics + AI insights
router.get("/summary", async (req: Request, res: Response) => {
  try {
    // Step 1: Prisma aggregations
    const metrics = await getAnalyticsMetrics();
    console.log("[ANALYTICS] Metrics aggregated");

    // Step 2: Gemini business insights
    const aiSummary = await generateBusinessInsights(metrics);
    console.log("[ANALYTICS] AI insights generated");

    sendSuccess(res, {
      metrics,
      aiSummary,
    });
  } catch (error: any) {
    console.error("[ANALYTICS] Error:", error.message || error);
    sendError(res, "Analytics unavailable", 503);
  }
});

export default router;