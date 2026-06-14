// ============================================
// Callback Utility
// Sends delivery receipt events back to CRM API
// Failures are logged but never crash the service
// ============================================

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const CRM_API_URL = process.env.CRM_API_URL || "http://localhost:3001";

interface CallbackPayload {
  communicationId: string;
  event: string;
}

export async function sendCallback(payload: CallbackPayload): Promise<void> {
  const url = `${CRM_API_URL}/api/receipt`;

  console.log(`[CALLBACK] Attempting → ${url} | ${payload.communicationId} : ${payload.event}`);

  try {
    await axios.post(url, payload, { timeout: 5000 });
    console.log(`[CALLBACK] ✓ Success  → ${payload.communicationId} : ${payload.event}`);
  } catch (error: any) {
    const message = error.response
      ? `HTTP ${error.response.status}`
      : error.code || error.message;
    console.log(`[CALLBACK] ✗ Failed   → ${payload.communicationId} : ${payload.event} (${message})`);
    // Do not rethrow — continue processing
  }
}