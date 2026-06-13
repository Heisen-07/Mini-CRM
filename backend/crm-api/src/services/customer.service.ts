// ============================================
// Customer Service
// Business logic for customer operations
// Uses Prisma directly — no repository layer
// ============================================

import prisma from "../config/database";

export async function getAllCustomers() {
  return prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
  });
}

export async function createCustomer(data: {
  name: string;
  email: string;
  phone?: string;
  city?: string;
}) {
  return prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      city: data.city,
    },
  });
}

// ============================================
// AI Audience Segmentation — Prisma Filter
// Converts structured JSON filter → Prisma query
// ============================================

export async function getCustomersByFilter(filter: Record<string, any>) {
  const where: any = {};

  if (filter.totalSpend) {
    where.totalSpend = { gt: filter.totalSpend.gt };
  }

  if (filter.city) {
    where.city = { equals: filter.city, mode: "insensitive" };
  }

  if (filter.orderCount) {
    where.orderCount = { gt: filter.orderCount.gt };
  }

  if (filter.inactiveDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filter.inactiveDays.gt);
    where.lastPurchaseDate = { lt: cutoffDate };
  }

  // Reject unknown filter keys
  const supportedKeys = ["totalSpend", "city", "orderCount", "inactiveDays"];
  const unknownKeys = Object.keys(filter).filter((k) => !supportedKeys.includes(k));
  if (unknownKeys.length > 0) {
    throw new Error(`Unsupported filter keys: ${unknownKeys.join(", ")}`);
  }

  return prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}