// ============================================
// Order Service
// Business logic for order operations
// Automatically updates Customer statistics
// ============================================

import prisma from "../config/database";

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

  // Create order and update customer statistics in a single transaction
  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        customerId: data.customerId,
        amount: data.amount,
        productCategory: data.productCategory,
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