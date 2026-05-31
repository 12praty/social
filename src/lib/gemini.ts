import { GoogleGenerativeAI } from "@google/generative-ai";
import { imagePromptInstructions, platformPrompt, systemPrompt, type PlatformKey } from "./prompts";
import type { BrandVoice } from "@prisma/client";

const apiKey = process.env.GOOGLE_API_KEY || "";
const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

function getModel(systemInstruction: string) {
  if (!client) throw new Error("GOOGLE_API_KEY is not set");
  return client.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction,
    generationConfig: { temperature: 0.85, topP: 0.95, maxOutputTokens: 1024 },
  });
}

export async function* streamPlatformPost(
  platform: PlatformKey,
  topic: string,
  tone: string,
  brand: BrandVoice | null
): AsyncGenerator<string, void, void> {
  const model = getModel(systemPrompt(brand));
  const prompt = platformPrompt(platform, topic, tone);
  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

export async function generatePlatformPost(
  platform: PlatformKey,
  topic: string,
  tone: string,
  brand: BrandVoice | null
): Promise<string> {
  const model = getModel(systemPrompt(brand));
  const prompt = platformPrompt(platform, topic, tone);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateImagePrompts(
  topic: string,
  content: string,
  platform: PlatformKey
): Promise<string[]> {
  if (!client) return [];
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { temperature: 0.7, responseMimeType: "application/json", maxOutputTokens: 600 },
  });
  try {
    const res = await model.generateContent(imagePromptInstructions(topic, content, platform));
    const txt = res.response.text().trim();
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) return parsed.filter((p) => typeof p === "string").slice(0, 3);
    return [];
  } catch (err) {
    console.error("[gemini] image prompts failed", err);
    throw err;
  }
}
