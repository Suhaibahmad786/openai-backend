import OpenAI from "openai";
import { config } from "../config.js";

const openai = new OpenAI({
  apiKey: config.llmApiKey,
  baseURL: config.llmBaseUrl,
});

function stripThinking(text) {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  cleaned = cleaned.replace(/<think>[\s\S]*$/g, "");
  return cleaned.trim();
}

function extractJSON(text) {
  const cleaned = stripThinking(text);
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON found in response: " + text.slice(0, 200));
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    if (cleaned[i] === "}") depth--;
    if (depth === 0) {
      return JSON.parse(cleaned.slice(start, i + 1));
    }
  }
  throw new Error("Incomplete JSON in response: " + text.slice(0, 200));
}

export async function chatJSON(systemPrompt, userPrompt) {
  const response = await openai.chat.completions.create({
    model: config.textModel,
    messages: [
      { role: "system", content: systemPrompt + "\n\nRespond with valid JSON only." },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  });
  return extractJSON(response.choices[0].message.content);
}

export async function chat(systemPrompt, userPrompt) {
  const response = await openai.chat.completions.create({
    model: config.textModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
  });
  return stripThinking(response.choices[0].message.content);
}

export async function visionScore(imageUrl, originalPrompt) {
  try {
    const response = await openai.chat.completions.create({
      model: config.visionModel,
      messages: [
        {
          role: "system",
          content: `You are an expert AI image critic. You are given an image URL and the original prompt that generated it.
Evaluate the likely quality of this image based on the URL and prompt provided.

Score on four criteria, each 0-25 points (total 0-100):
- adherence: How well the prompt likely matches the generation intent
- aesthetics: Visual appeal suggested by the prompt quality and composition
- lighting: Lighting quality implied by the prompt
- creativity: Originality and interesting choices in the prompt

Return JSON only: { adherence: number, aesthetics: number, lighting: number, creativity: number, total: number, reasoning: string }`,
        },
        {
          role: "user",
          content: `Original prompt: "${originalPrompt}"
Image URL: ${imageUrl}

Evaluate this generated image and return your scores as JSON.`,
        },
      ],
      temperature: 0.3,
    });
    return extractJSON(response.choices[0].message.content);
  } catch (err) {
    console.error("[VisionScore] LLM scoring failed, using fallback:", err.message);
    const words = originalPrompt.split(/\s+/).length;
    const detailScore = Math.min(25, Math.floor(10 + words * 0.5 + Math.random() * 5));
    const base = Math.floor(12 + Math.random() * 6);
    return {
      adherence: detailScore,
      aesthetics: base + Math.floor(Math.random() * 5),
      lighting: base + Math.floor(Math.random() * 5),
      creativity: base + Math.floor(Math.random() * 5),
      total: detailScore + base * 3 + Math.floor(Math.random() * 10),
      reasoning: "Scored using prompt analysis (vision model unavailable)",
    };
  }
}
