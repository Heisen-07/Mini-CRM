// ============================================
// Campaign Service
// Business logic for campaign operations
// ============================================

import prisma from "../config/database";

export async function getAllCampaigns() {
  return prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createCampaign(data: {
  name: string;
  goal?: string;
  channel?: string;
  message?: string;
}) {
  return prisma.campaign.create({
    data: {
      name: data.name,
      goal: data.goal,
      channel: data.channel,
      message: data.message,
    },
  });
}