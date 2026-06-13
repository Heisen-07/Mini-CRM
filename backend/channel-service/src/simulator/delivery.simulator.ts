// ============================================
// Delivery Simulator
// Simulates the communication lifecycle:
//   PENDING → DELIVERED → OPENED → CLICKED
// Occasionally simulates FAILED instead
// Uses simple setTimeout — no queues, no Redis
// ============================================

import { sendCallback } from "../utils/callback";

type DeliveryEvent = "PENDING" | "DELIVERED" | "OPENED" | "CLICKED" | "FAILED";

interface SimulationRequest {
  communicationId: string;
  customerId: string;
  channel: string;
  message: string;
}

export function simulateDelivery(request: SimulationRequest): void {
  const { communicationId, customerId, channel } = request;

  // ~10% chance of failure
  const willFail = Math.random() < 0.1;

  // --- Immediately: PENDING ---
  logEvent(communicationId, customerId, channel, "PENDING");
  sendCallback({ communicationId, event: "PENDING" });

  if (willFail) {
    // --- After 2s: FAILED ---
    setTimeout(() => {
      logEvent(communicationId, customerId, channel, "FAILED");
      sendCallback({ communicationId, event: "FAILED" });
    }, 2000);
    return;
  }

  // --- After 2s: DELIVERED ---
  setTimeout(() => {
    logEvent(communicationId, customerId, channel, "DELIVERED");
    sendCallback({ communicationId, event: "DELIVERED" });
  }, 2000);

  // --- After 5s: OPENED ---
  setTimeout(() => {
    logEvent(communicationId, customerId, channel, "OPENED");
    sendCallback({ communicationId, event: "OPENED" });
  }, 5000);

  // --- After 8s: CLICKED ---
  setTimeout(() => {
    logEvent(communicationId, customerId, channel, "CLICKED");
    sendCallback({ communicationId, event: "CLICKED" });
  }, 8000);
}

function logEvent(
  communicationId: string,
  customerId: string,
  channel: string,
  event: DeliveryEvent
): void {
  const timestamp = new Date().toISOString();
  console.log(
    `[SIMULATOR] ${timestamp} | ${event.padEnd(9)} | ${channel} | ${communicationId} | ${customerId}`
  );
}