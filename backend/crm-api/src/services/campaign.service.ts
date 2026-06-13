// ============================================
// Campaign Service
// Business logic for campaign operations
// Includes campaign launch workflow
// ============================================

import axios from "axios";
import prisma from "../config/database";
import { env } from "../config/env";

export async function getAllCampaigns() {
  return prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaignById(id: string) {
  return prisma.campaign.findUnique({
    where: { id },
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

export async function launchCampaign(campaignId: string) {
  // 1. Find campaign
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    return { error: "Campaign not found", status: 404 };
  }

  if (campaign.status === "launched") {
    return { error: "Campaign already launched", status: 400 };
  }

  // 2. Find all customers (no segmentation yet)
  const customers = await prisma.customer.findMany();

  if (customers.length === 0) {
    return { error: "No customers found", status: 400 };
  }

  // 3. Create Communication records for each customer
  const communications = await Promise.all(
    customers.map((customer) =>
      prisma.communication.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          channel: campaign.channel,
          message: campaign.message,
          status: "pending",
        },
      })
    )
  );

  // 4. Send each communication to Channel Service (fire-and-forget)
  for (const comm of communications) {
    sendToChannelService(comm.id, comm.customerId, comm.channel, comm.message || "")
      .catch(() => {}); // Errors logged inside, never crash
  }

  // 5. Update campaign status to launched
  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "launched",
      audienceSize: customers.length,
    },
  });

  return {
    campaign: updated,
    communicationsCreated: communications.length,
  };
}

async function sendToChannelService(
  communicationId: string,
  customerId: string,
  channel: string,
  message: string
): Promise<void> {
  const url = `${env.CHANNEL_SERVICE_URL}/send`;

  try {
    await axios.post(url, {
      communicationId,
      customerId,
      channel,
      message,
    }, { timeout: 5000 });

    console.log(`[LAUNCH] ✓ Sent to Channel Service → ${communicationId}`);
  } catch (error: any) {
    const reason = error.response
      ? `HTTP ${error.response.status}`
      : error.code || error.message;
    console.log(`[LAUNCH] ✗ Channel Service failed → ${communicationId} (${reason})`);
  }
}