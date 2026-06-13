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