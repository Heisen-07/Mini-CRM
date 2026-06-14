// ============================================
// Campaign Service
// Business logic for campaign operations
// Includes campaign launch workflow
// ============================================

import axios from "axios";
import prisma from "../config/database";
import { env } from "../config/env";
import { segmentCustomers } from "../ai/gemini.service";
import { getCustomersByFilter, getAllCustomers } from "./customer.service";

// ============================================
// Campaign Analysis Cache (Persistent)
// Avoids calling Gemini on every campaign detail view
// ============================================

interface CampaignAnalysisCache {
  insights: string[];
  snapshot: string | null;
  generatedAt: string;
}

export async function getCachedAnalysis(campaignId: string): Promise<CampaignAnalysisCache | null> {
  const cacheEntry = await prisma.aIInsightCache.findUnique({
    where: {
      type_entityId: {
        type: "campaign_analysis",
        entityId: campaignId,
      },
    },
  });

  if (!cacheEntry) return null;

  return {
    insights: JSON.parse(cacheEntry.content),
    snapshot: cacheEntry.snapshot,
    generatedAt: cacheEntry.generatedAt.toISOString(),
  };
}

export async function setCachedAnalysis(campaignId: string, insights: string[], snapshot: string): Promise<void> {
  const now = new Date();
  await prisma.aIInsightCache.upsert({
    where: {
      type_entityId: {
        type: "campaign_analysis",
        entityId: campaignId,
      },
    },
    update: {
      content: JSON.stringify(insights),
      snapshot,
      generatedAt: now,
    },
    create: {
      type: "campaign_analysis",
      entityId: campaignId,
      content: JSON.stringify(insights),
      snapshot,
      generatedAt: now,
    },
  });
}

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
  segmentQuery?: string;
  segmentFilter?: string | null;
  audienceSize?: number;
}) {
  return prisma.campaign.create({
    data: {
      name: data.name,
      goal: data.goal,
      channel: data.channel,
      message: data.message,
      segmentQuery: data.segmentQuery,
      segmentFilter: data.segmentFilter,
      audienceSize: data.audienceSize ?? 0,
    },
  });
}

// ============================================
// Resolve a natural-language segment into an executable filter + audience size.
// Runs at campaign creation (off the send path) so launch never calls Gemini.
// Falls back to "all customers" when the query can't be turned into a filter.
// ============================================
export async function resolveSegment(
  segmentQuery: string
): Promise<{ segmentFilter: string | null; audienceSize: number }> {
  try {
    const filter = await segmentCustomers(segmentQuery);
    const customers = await getCustomersByFilter(filter);
    return { segmentFilter: JSON.stringify(filter), audienceSize: customers.length };
  } catch (error: any) {
    console.log(
      `[SEGMENT] Could not resolve "${segmentQuery}", defaulting to all customers:`,
      error.message || error
    );
    const all = await getAllCustomers();
    return { segmentFilter: null, audienceSize: all.length };
  }
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

  // 2. Resolve the target audience from the campaign's stored segment.
  //    Falls back to all customers when no segment was attached (legacy campaigns).
  let customers;
  if (campaign.segmentFilter) {
    try {
      customers = await getCustomersByFilter(JSON.parse(campaign.segmentFilter));
    } catch (error) {
      return { error: "Campaign has an invalid segment filter", status: 500 };
    }
  } else {
    customers = await prisma.customer.findMany();
  }

  if (customers.length === 0) {
    return { error: "Segment matched no customers", status: 400 };
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

// ============================================
// Campaign Details with Performance Metrics
// Aggregates Communication + CommunicationEvent data
// ============================================

export async function getCampaignWithPerformance(id: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    return { error: "Campaign not found", status: 404 };
  }

  // For draft campaigns, no performance data
  if (campaign.status === "draft") {
    return { campaign, performance: null };
  }

  // Count communications by status
  const commStatusGroups = await prisma.communication.groupBy({
    by: ["status"],
    where: { campaignId: id },
    _count: { id: true },
  });

  // Count events by eventType for this campaign's communications
  const commIds = await prisma.communication.findMany({
    where: { campaignId: id },
    select: { id: true },
  });
  const commIdList = commIds.map((c) => c.id);

  const eventGroups = await prisma.communicationEvent.groupBy({
    by: ["eventType"],
    where: { communicationId: { in: commIdList } },
    _count: { id: true },
  });

  // Build counts
  const total = commIdList.length;
  const statusMap: Record<string, number> = {};
  for (const g of commStatusGroups) {
    statusMap[g.status] = g._count.id;
  }
  const eventMap: Record<string, number> = {};
  for (const g of eventGroups) {
    eventMap[g.eventType] = g._count.id;
  }

  const delivered = eventMap["DELIVERED"] || 0;
  const opened = eventMap["OPENED"] || 0;
  const clicked = eventMap["CLICKED"] || 0;
  const failed = eventMap["FAILED"] || 0;
  const pending = statusMap["pending"] || 0;

  const openRate = total > 0 ? Math.round((opened / total) * 1000) / 10 : 0;
  const clickRate = total > 0 ? Math.round((clicked / total) * 1000) / 10 : 0;
  const failureRate = total > 0 ? Math.round((failed / total) * 1000) / 10 : 0;

  // Revenue attribution: orders credited to this campaign via last-touch
  // attribution (see order.service.ts). This answers the brief's
  // "order came because of this communication".
  const attributed = await prisma.order.aggregate({
    where: { campaignId: id },
    _count: { id: true },
    _sum: { amount: true },
  });
  const conversions = attributed._count.id;
  const revenue = attributed._sum.amount || 0;
  const conversionRate = total > 0 ? Math.round((conversions / total) * 1000) / 10 : 0;

  return {
    campaign,
    performance: {
      total,
      pending,
      delivered,
      opened,
      clicked,
      failed,
      openRate,
      clickRate,
      failureRate,
      conversions,
      revenue,
      conversionRate,
    },
  };
}

// ============================================
// Update Campaign Message (draft only)
// ============================================

export async function updateCampaignMessage(id: string, message: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    return { error: "Campaign not found", status: 404 };
  }

  if (campaign.status === "launched") {
    return { error: "Cannot edit a launched campaign", status: 400 };
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: { message },
  });

  return { campaign: updated };
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