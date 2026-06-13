// ============================================
// Standard API Response Helper
// Ensures all responses follow the same shape
// ============================================

import { Response } from "express";

export function sendSuccess(res: Response, data: object, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    ...data,
  });
}

export function sendError(res: Response, message: string, statusCode: number = 500) {
  return res.status(statusCode).json({
    success: false,
    message,
  });
}