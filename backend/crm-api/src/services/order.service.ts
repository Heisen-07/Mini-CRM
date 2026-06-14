// ============================================
// Order Service
// Business logic for order operations
// Automatically updates Customer statistics
// ============================================

import prisma from "../config/database";
import { env } from "../config/env";

// Communication statuses that count as "engaged" for last-touch attribution.
// A customer who was at least delivered a message can have a subsequent order
// credited to that communication's campaign.
const ENGAGED_STATUSES = ["delivered", "opened", "clicked"];

/**
 * Last-touch attribution: find the most recent engaged communication sent to
 * this customer within the attribution window. An order placed afterwards is
 * credited to that communication (and its campaign). Returns null when the
 * order was not preceded by any engaged communication.
 */
async function findAttribution(
  customerId: string
): Promise<{ campaignId: string; communicationId: string } | null> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - env.ATTRIBUTION_WINDOW_DAYS);

  const comm = await prisma.communication.findFirst({
    where: {
      customerId,
      status: { in: ENGAGED_STATUSES },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, campaignId: true },
  });

  if (!comm) return null;
  return { campaignId: comm.campaignId, communicationId: comm.id };
}

export async function getAllOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createOrder(data: {
  customerId: string;
  amount: number;
  productCategory?: string;
}) {
  // Verify customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  });

  if (!customer) {
    return null;
  }

  // Resolve last-touch attribution before persisting the order
  const attribution = await findAttribution(data.customerId);

  // Create order and update customer statistics in a single transaction
  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        customerId: data.customerId,
        amount: data.amount,
        productCategory: data.productCategory,
        campaignId: attribution?.campaignId ?? null,
        communicationId: attribution?.communicationId ?? null,
      },
    }),
    prisma.customer.update({
      where: { id: data.customerId },
      data: {
        totalSpend: { increment: data.amount },
        orderCount: { increment: 1 },
        lastPurchaseDate: new Date(),
      },
    }),
  ]);

  return order;
}