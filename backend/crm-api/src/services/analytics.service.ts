// ============================================
// Analytics Service
// Aggregates CRM metrics using Prisma
// ============================================

import prisma from "../config/database";

export async function getAnalyticsMetrics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Run all queries in parallel
  const [
    totalCustomers,
    totalOrders,
    revenueResult,
    highestSpender,
    cityGroups,
    inactive30,
    inactive90,
  ] = await Promise.all([
    prisma.customer.count(),

    prisma.order.count(),

    prisma.order.aggregate({
      _sum: { amount: true },
      _avg: { amount: true },
    }),

    prisma.customer.findFirst({
      orderBy: { totalSpend: "desc" },
      select: { name: true, totalSpend: true, city: true },
    }),

    prisma.customer.groupBy({
      by: ["city"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 1,
    }),

    prisma.customer.count({
      where: {
        OR: [
          { lastPurchaseDate: null },
          { lastPurchaseDate: { lt: thirtyDaysAgo } },
        ],
      },
    }),

    prisma.customer.count({
      where: {
        OR: [
          { lastPurchaseDate: null },
          { lastPurchaseDate: { lt: ninetyDaysAgo } },
        ],
      },
    }),
  ]);

  const totalRevenue = revenueResult._sum.amount || 0;
  const avgOrderValue = revenueResult._avg.amount
    ? Math.round(revenueResult._avg.amount * 100) / 100
    : 0;
  const topCity = cityGroups[0]?.city || "N/A";
  const topCityCount = cityGroups[0]?._count.id || 0;

  return {
    totalCustomers,
    totalOrders,
    totalRevenue,
    avgOrderValue,
    highestSpender: highestSpender
      ? `${highestSpender.name} (₹${highestSpender.totalSpend})`
      : "N/A",
    topCity: `${topCity} (${topCityCount} customers)`,
    inactive30,
    inactive90,
  };
}