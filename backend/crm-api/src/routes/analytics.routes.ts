// ============================================
// Analytics Routes
// GET  /api/analytics/summary → cached metrics + insights
// POST /api/analytics/refresh → force regenerate AI insights
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { getAnalyticsMetrics } from "../services/analytics.service";
import { generateBusinessInsights } from "../ai/gemini.service";
import prisma from "../config/database";

const router = Router();

// ============================================
// Deterministic Fallback Insights
// Rule-based insights that never call Gemini
// ============================================

function getDeterministicInsights(metrics: {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  highestSpender: string;
  topCity: string;
  inactive30: number;
  inactive90: number;
}): string[] {
  const insights: string[] = [];

  // Revenue per customer
  if (metrics.totalCustomers > 0) {
    const revenuePerCustomer = Math.round(metrics.totalRevenue / metrics.totalCustomers);
    insights.push(`Average revenue per customer is ₹${revenuePerCustomer.toLocaleString()}.`);
  }

  // Inactivity warnings
  if (metrics.inactive90 > 20) {
    insights.push(`${metrics.inactive90} customers inactive for 90+ days — consider a re-engagement campaign with a compelling offer.`);
  } else if (metrics.inactive30 > 20) {
    insights.push(`${metrics.inactive30} customers inactive for 30+ days — a timely reminder campaign could help retain them.`);
  }

  // Top city insight
  if (metrics.topCity && metrics.topCity !== "N/A") {
    insights.push(`${metrics.topCity} is your top market — consider a city-specific promotion to maximize engagement.`);
  }

  // Highest spender insight
  if (metrics.highestSpender && metrics.highestSpender !== "N/A") {
    insights.push(`Top spender: ${metrics.highestSpender}. Consider a VIP loyalty reward to retain high-value customers.`);
  }

  // Order value recommendation
  if (metrics.avgOrderValue < 500 && metrics.totalOrders > 0) {
    insights.push(`Average order value is ₹${metrics.avgOrderValue} — bundle offers or minimum-spend rewards could increase basket size.`);
  }

  // Ensure at least one insight
  if (insights.length === 0) {
    insights.push(`Your CRM has ${metrics.totalCustomers} customers and ₹${metrics.totalRevenue.toLocaleString()} in revenue.`);
  }

  return insights;
}

// ============================================
// GET /summary — metrics + cached/fallback insights
// Never calls Gemini automatically
// ============================================

router.get("/summary", async (req: Request, res: Response) => {
  try {
    // Step 1: Prisma aggregations (always fresh)
    const metrics = await getAnalyticsMetrics();
    console.log("[ANALYTICS] Metrics aggregated");

    // Step 2: Check persistent cache
    const cacheEntry = await prisma.aIInsightCache.findFirst({
      where: { type: "analytics", entityId: null },
    });

    if (cacheEntry) {
      console.log("[ANALYTICS] Returning cached insights from DB");
      sendSuccess(res, {
        metrics,
        aiSummary: JSON.parse(cacheEntry.content),
        cached: true,
        generatedAt: cacheEntry.generatedAt,
      });
      return;
    }

    // Step 3: No valid cache — return deterministic fallback (NO Gemini call)
    const fallback = getDeterministicInsights(metrics);
    console.log("[ANALYTICS] Returning deterministic insights (no Gemini call)");

    sendSuccess(res, {
      metrics,
      aiSummary: fallback,
      cached: false,
      generatedAt: null,
    });
  } catch (error: any) {
    console.error("[ANALYTICS] Error:", error.message || error);
    sendError(res, "Analytics unavailable", 503);
  }
});

// ============================================
// POST /refresh — force regenerate AI insights
// Only endpoint that calls Gemini for analytics
// ============================================

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    // Step 1: Fresh metrics
    const metrics = await getAnalyticsMetrics();
    console.log("[ANALYTICS] Metrics aggregated for refresh");

    // Step 2: Check if metrics changed
    const currentSnapshot = JSON.stringify(metrics);
    let cacheEntry = await prisma.aIInsightCache.findFirst({
      where: { type: "analytics", entityId: null },
    });

    if (cacheEntry && cacheEntry.snapshot === currentSnapshot) {
      console.log("[ANALYTICS] Refresh blocked (data_unchanged)");
      sendSuccess(res, {
        metrics,
        aiSummary: JSON.parse(cacheEntry.content),
        cached: true,
        reason: "data_unchanged",
        generatedAt: cacheEntry.generatedAt,
      });
      return;
    }

    // Step 3: Call Gemini
    const aiSummary = await generateBusinessInsights(metrics);
    console.log("[ANALYTICS] AI insights generated (refresh)");

    // Step 4: Update persistent cache
    const now = new Date();
    if (cacheEntry) {
      await prisma.aIInsightCache.update({
        where: { id: cacheEntry.id },
        data: { content: JSON.stringify(aiSummary), snapshot: currentSnapshot, generatedAt: now },
      });
    } else {
      await prisma.aIInsightCache.create({
        data: { type: "analytics", content: JSON.stringify(aiSummary), snapshot: currentSnapshot, generatedAt: now },
      });
    }

    sendSuccess(res, {
      metrics,
      aiSummary,
      cached: false,
      generatedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[ANALYTICS] Refresh error:", error.message || error);
    sendError(res, "AI insights generation failed", 503);
  }
});

export default router;