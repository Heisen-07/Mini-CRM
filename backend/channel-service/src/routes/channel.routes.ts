// ============================================
// Channel Routes
// GET  /health → liveness check
// POST /send   → accept communication request
// ============================================

import { Router, Request, Response } from "express";
import { handleSend } from "../services/channel.service";

const router = Router();

// Health check
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: "channel-service",
  });
});

// Accept a communication request
router.post("/send", (req: Request, res: Response) => {
  const result = handleSend(req.body);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

export default router;