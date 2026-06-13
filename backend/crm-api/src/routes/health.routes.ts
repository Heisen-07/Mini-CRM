// ============================================
// Health Check Routes
// GET /health     → basic liveness check
// GET /health/db  → database connectivity check
// ============================================

import { Router, Request, Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError } from "../utils/response";

const router = Router();

// Basic health check — is the server alive?
router.get("/", (_req: Request, res: Response) => {
  sendSuccess(res, {
    service: "crm-api",
    status: "healthy",
  });
});

// Database health check — can we reach Supabase?
router.get("/db", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, {
      database: "connected",
    });
  } catch (error) {
    sendError(res, "Database connection failed", 503);
  }
});

export default router;
