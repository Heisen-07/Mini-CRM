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
// Converts a structured JSON filter → Prisma query.
// Supports gt/gte/lt/lte/eq on numeric fields, an exact city match,
// and an inactive-days cutoff. This is what lets queries like
// "never purchased" (orderCount eq 0) actually narrow the audience.
// ============================================

const SUPPORTED_FILTER_KEYS = ["totalSpend", "orderCount", "city", "inactiveDays"];

// Build a Prisma numeric condition from a spec like {gt, gte, lt, lte, eq}.
// Also accepts a bare number ({orderCount: 0}) and "equals" as an alias for "eq".
function numericCondition(spec: any): Record<string, number> | null {
  if (typeof spec === "number") return { equals: spec };
  if (!spec || typeof spec !== "object") return null;

  const cond: Record<string, number> = {};
  if (typeof spec.gt === "number") cond.gt = spec.gt;
  if (typeof spec.gte === "number") cond.gte = spec.gte;
  if (typeof spec.lt === "number") cond.lt = spec.lt;
  if (typeof spec.lte === "number") cond.lte = spec.lte;
  if (typeof spec.eq === "number") cond.equals = spec.eq;
  if (typeof spec.equals === "number") cond.equals = spec.equals;

  return Object.keys(cond).length > 0 ? cond : null;
}

export async function getCustomersByFilter(filter: Record<string, any>) {
  // Reject unknown filter keys (defense-in-depth against off-contract AI output)
  const unknownKeys = Object.keys(filter).filter((k) => !SUPPORTED_FILTER_KEYS.includes(k));
  if (unknownKeys.length > 0) {
    throw new Error(`Unsupported filter keys: ${unknownKeys.join(", ")}`);
  }

  const where: any = {};

  if (filter.totalSpend !== undefined) {
    const cond = numericCondition(filter.totalSpend);
    if (cond) where.totalSpend = cond;
  }

  if (filter.orderCount !== undefined) {
    const cond = numericCondition(filter.orderCount);
    if (cond) where.orderCount = cond;
  }

  if (filter.city) {
    where.city = { equals: filter.city, mode: "insensitive" };
  }

  if (filter.inactiveDays !== undefined) {
    const days =
      typeof filter.inactiveDays === "number"
        ? filter.inactiveDays
        : filter.inactiveDays?.gt ?? filter.inactiveDays?.gte;
    if (typeof days === "number") {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      where.lastPurchaseDate = { lt: cutoffDate };
    }
  }

  return prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}