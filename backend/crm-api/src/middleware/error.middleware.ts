// ============================================
// Global Error Handling Middleware
// Catches all unhandled errors and returns JSON
// ============================================

import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Unhandled error:", err.message);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
}