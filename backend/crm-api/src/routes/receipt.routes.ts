// ============================================
// Receipt Routes
// POST /api/receipt → receive delivery events
//                     from Channel Service
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { processReceipt } from "../services/receipt.service";

const router = Router();

// Receive delivery receipt from Channel Service
router.post("/", async (req: Request, res: Response) => {
  try {
    const { communicationId, event } = req.body;
    const result = await processReceipt(communicationId, event);

    if ("error" in result) {
      sendError(res, result.error as string, result.status as number);
      return;
    }

    sendSuccess(res, { received: true });
  } catch (error) {
    sendError(res, "Failed to process receipt");
  }
});

export default router;