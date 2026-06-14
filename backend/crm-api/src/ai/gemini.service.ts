// ============================================
// Gemini Service
// Generates campaign messages using Gemini AI
// Model: gemini-2.5-flash
// ============================================

import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    if (!env.GEMINI_API_KEY) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in env variables!");
    }
    aiInstance = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: {
        timeout: 30000, // 30 seconds timeout
      },
    });
  }
  return aiInstance;
}

export async function generateCampaignMessage(data: {
  goal: string;
  channel: string;
  offer: string;
}): Promise<string> {
  const prompt = `You are a marketing copywriter for a CRM platform.

Generate a short, engaging marketing message with the following details:

Campaign Goal: ${data.goal}
Communication Channel: ${data.channel}
Offer: ${data.offer}

Rules:
- Keep it under 3 sentences
- Make it personal and friendly
- Include the offer naturally
- Return ONLY the message text
- No markdown, no HTML, no formatting
- No subject lines or headers
- No explanations`;

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}

// ============================================
// AI Audience Segmentation
// Converts natural language → structured JSON filter
// ============================================

export async function segmentCustomers(query: string): Promise<Record<string, any>> {
  const prompt = `You are a CRM data filter engine.

Convert the following natural language query into a structured JSON filter.

Query: "${query}"

You MUST return ONLY valid JSON. No markdown, no explanation, no code fences.

Supported filters (use ONLY these):

1. Total spend filter:
   {"totalSpend": {"gt": NUMBER}}

2. City filter:
   {"city": "CITY_NAME"}

3. Order count filter:
   {"orderCount": {"gt": NUMBER}}

4. Inactive days filter:
   {"inactiveDays": {"gt": NUMBER}}

Rules:
- Return EXACTLY one JSON object
- Use only the filters listed above
- If the query doesn't match any supported filter, return: {"error": "unsupported query"}
- No arrays, no nested objects beyond what's shown
- No markdown formatting
- No code blocks
- ONLY raw JSON`;

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned empty response for segmentation");
  }

  // Clean potential markdown code fences from response
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  const parsed = JSON.parse(cleaned);

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  return parsed;
}

// ============================================
// AI Business Insights
// Generates analytics summary from CRM metrics
// ============================================

export async function generateBusinessInsights(metrics: {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  highestSpender: string;
  topCity: string;
  inactive30: number;
  inactive90: number;
}): Promise<string[]> {
  const prompt = `You are a CRM business analyst.

Given the following CRM metrics, generate 3-5 concise business insights.

Metrics:
- Total Customers: ${metrics.totalCustomers}
- Total Orders: ${metrics.totalOrders}
- Total Revenue: ₹${metrics.totalRevenue}
- Average Order Value: ₹${metrics.avgOrderValue}
- Highest Spender: ${metrics.highestSpender}
- Top City: ${metrics.topCity}
- Inactive > 30 days: ${metrics.inactive30}
- Inactive > 90 days: ${metrics.inactive90}

Rules:
- Return a JSON array of 3-5 strings
- Each string is one concise insight
- Focus on actionable business observations
- Mention specific numbers and names from the data
- No markdown, no code fences
- ONLY return the JSON array

Example format:
["insight 1", "insight 2", "insight 3"]`;

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned empty response for insights");
  }

  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini returned non-array response for insights");
  }

  return parsed;
}

// ============================================
// AI Campaign Builder
// Generates full campaign plan from a business goal
// ============================================

export async function generateCampaignPlan(goal: string): Promise<{
  campaignName: string;
  segmentQuery: string;
  channel: string;
  message: string;
}> {
  const prompt = `You are a CRM campaign strategist.

Given the following business goal, generate a complete campaign plan.

Business Goal: "${goal}"

Return a JSON object with exactly these 4 fields:

{
  "campaignName": "Short campaign name (3-6 words)",
  "segmentQuery": "Natural language audience query (e.g. 'Customers inactive for 30 days')",
  "channel": "email or sms or whatsapp",
  "message": "Short marketing message (2-3 sentences)"
}

Rules:
- Return ONLY the JSON object
- campaignName must be concise and descriptive
- segmentQuery must describe the target audience in plain English
- channel must be one of: email, sms, whatsapp
- message must be friendly and include a relevant offer
- No markdown, no code fences, no explanations
- ONLY raw JSON`;

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned empty response for campaign plan");
  }

  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // Validate required fields
  if (!parsed.campaignName || !parsed.segmentQuery || !parsed.channel || !parsed.message) {
    throw new Error("Gemini returned incomplete campaign plan");
  }

  return parsed;
}

// ============================================
// Channel Reasoning
// Explains why a specific channel was selected
// ============================================

const CHANNEL_FALLBACKS: Record<string, string> = {
  email: "Email is ideal for this campaign because it supports rich content, detailed offers, and longer messages. It provides the best open-tracking capabilities and allows customers to engage at their own pace.",
  sms: "SMS was selected for its immediacy and high open rates. Short, time-sensitive offers perform best on SMS, ensuring the message is seen quickly by the target audience.",
  whatsapp: "WhatsApp offers high engagement rates and a conversational format. It's excellent for promotional content that benefits from a personal, direct communication style.",
  rcs: "RCS (Rich Communication Services) combines the reach of SMS with rich media support, enabling interactive and visually engaging campaign messages.",
};

export async function generateChannelReasoning(
  channel: string,
  goal: string,
  message: string
): Promise<string> {
  try {
    const prompt = `You are a CRM channel strategist.

Explain in 2-3 sentences why "${channel}" is the best channel for this campaign.

Campaign Goal: "${goal}"
Campaign Message: "${message}"

Rules:
- Be specific about the channel's strengths
- Reference the campaign goal and message content
- Return ONLY plain text, no markdown, no bullets
- Keep it concise and insightful`;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response");
    return text;
  } catch (error) {
    console.log("[CHANNEL-REASONING] Gemini unavailable, using fallback");
    return CHANNEL_FALLBACKS[channel.toLowerCase()] || CHANNEL_FALLBACKS["email"];
  }
}

// ============================================
// Campaign Performance Analysis
// AI-powered insights from delivery metrics
// ============================================

export async function generateCampaignAnalysis(data: {
  name: string;
  channel: string;
  message: string | null;
  audienceSize: number;
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  openRate: number;
  clickRate: number;
  failureRate: number;
}): Promise<string[]> {
  // Deterministic fallback insights
  const fallback: string[] = [];
  fallback.push(`Campaign "${data.name}" reached ${data.total} recipients via ${data.channel}.`);
  if (data.openRate > 50) {
    fallback.push(`Strong open rate of ${data.openRate}% indicates good subject line and audience targeting.`);
  } else if (data.openRate > 0) {
    fallback.push(`Open rate of ${data.openRate}% suggests room for improvement in messaging or timing.`);
  }
  if (data.clickRate > 10) {
    fallback.push(`Click rate of ${data.clickRate}% shows strong call-to-action engagement.`);
  } else if (data.total > 0) {
    fallback.push(`Consider strengthening the call-to-action to improve the ${data.clickRate}% click rate.`);
  }
  if (data.failed > 0) {
    fallback.push(`${data.failed} deliveries failed (${data.failureRate}%). Review audience data quality.`);
  }

  try {
    const prompt = `You are a CRM campaign analyst.

Analyze this campaign's performance and provide 3-5 concise insights.

Campaign: "${data.name}"
Channel: ${data.channel}
Audience Size: ${data.audienceSize}
Total Sent: ${data.total}
Delivered: ${data.delivered}
Opened: ${data.opened}
Clicked: ${data.clicked}
Failed: ${data.failed}
Open Rate: ${data.openRate}%
Click Rate: ${data.clickRate}%
Failure Rate: ${data.failureRate}%

Rules:
- Return a JSON array of 3-5 strings
- Each string is one actionable insight
- Reference specific numbers
- Include recommendations
- No markdown, no code fences
- ONLY return the JSON array`;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty response");

    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid format");
    return parsed;
  } catch (error) {
    console.log("[CAMPAIGN-ANALYSIS] Gemini unavailable, using fallback");
    return fallback;
  }
}