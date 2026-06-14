// ============================================
// Analytics Routes
// GET  /api/analytics/summary → cached metrics + insights
// POST /api/analytics/refresh → force regenerate AI insights
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { getAnalyticsMetrics } from "../services/analytics.service";
import { generateBusinessInsights } from "../ai/gemini.service";

const router = Router();

// ============================================
// In-Memory Insights Cache
// TTL: 24 hours — avoids Gemini call on every dashboard visit
// ============================================

interface InsightsCache {
  aiSummary: string[];
  generatedAt: string;
}

let cachedInsights: InsightsCache | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isCacheValid(): boolean {
  if (!cachedInsights) return false;
  const age = Date.now() - new Date(cachedInsights.generatedAt).getTime();
  return age < CACHE_TTL_MS;
}

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

    // Step 2: Return cached AI insights if available
    if (isCacheValid()) {
      console.log("[ANALYTICS] Returning cached insights");
      sendSuccess(res, {
        metrics,
        aiSummary: cachedInsights!.aiSummary,
        cached: true,
        generatedAt: cachedInsights!.generatedAt,
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

    // Step 2: Call Gemini
    const aiSummary = await generateBusinessInsights(metrics);
    console.log("[ANALYTICS] AI insights generated (refresh)");

    // Step 3: Update cache
    cachedInsights = {
      aiSummary,
      generatedAt: new Date().toISOString(),
    };

    sendSuccess(res, {
      metrics,
      aiSummary,
      cached: false,
      generatedAt: cachedInsights.generatedAt,
    });
  } catch (error: any) {
    console.error("[ANALYTICS] Refresh error:", error.message || error);
    sendError(res, "AI insights generation failed", 503);
  }
});

export default router;