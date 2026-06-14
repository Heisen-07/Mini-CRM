// ============================================
// Environment Configuration
// Loads and validates environment variables
// ============================================

import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || "",
  CHANNEL_SERVICE_URL: process.env.CHANNEL_SERVICE_URL || "http://localhost:3002",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  // Last-touch attribution window: an order is credited to a communication only
  // if the customer was engaged within this many days before the order.
  ATTRIBUTION_WINDOW_DAYS: parseInt(process.env.ATTRIBUTION_WINDOW_DAYS || "7", 10),
};