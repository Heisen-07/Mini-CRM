// ============================================
// Environment Configuration
// Loads and validates environment variables
// ============================================

import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || "",
  CHANNEL_SERVICE_URL: process.env.CHANNEL_SERVICE_URL || "http://localhost:3001",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
};