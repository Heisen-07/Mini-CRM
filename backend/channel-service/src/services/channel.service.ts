// ============================================
// Channel Service
// Accepts communication requests and kicks off
// the delivery simulation pipeline
// ============================================

import { simulateDelivery } from "../simulator/delivery.simulator";

interface SendRequest {
  communicationId: string;
  customerId: string;
  channel: string;
  message: string;
}

export function handleSend(data: SendRequest): { success: boolean; status: string } {
  const { communicationId, customerId, channel, message } = data;

  // Validate required fields
  if (!communicationId || !customerId || !channel || !message) {
    return { success: false, status: "missing_fields" };
  }

  console.log(`[CHANNEL] Communication received → ${communicationId} | ${channel} | ${customerId}`);

  // Fire-and-forget simulation
  simulateDelivery({ communicationId, customerId, channel, message });

  return { success: true, status: "queued" };
}