// ============================================
// Receipt Service
// Processes delivery receipt events from
// Channel Service callbacks
// ============================================

import prisma from "../config/database";

const VALID_EVENTS = ["PENDING", "DELIVERED", "OPENED", "CLICKED", "FAILED"];

export async function processReceipt(communicationId: string, event: string) {
  if (!communicationId || !event) {
    return { error: "communicationId and event are required", status: 400 };
  }

  if (!VALID_EVENTS.includes(event)) {
    return { error: `Invalid event: ${event}`, status: 400 };
  }

  // Find the communication
  const communication = await prisma.communication.findUnique({
    where: { id: communicationId },
  });

  if (!communication) {
    console.log(`[RECEIPT] Communication not found: ${communicationId}`);
    return { error: "Communication not found", status: 404 };
  }

  // Update communication status
  await prisma.communication.update({
    where: { id: communicationId },
    data: { status: event.toLowerCase() },
  });

  // Create event record
  await prisma.communicationEvent.create({
    data: {
      communicationId,
      eventType: event,
    },
  });

  console.log(`[RECEIPT] ✓ ${event} → ${communicationId}`);

  return { success: true };
}