import OpenAI from "openai";
import { config } from "../config.js";

const openai = new OpenAI({
  apiKey: config.llmApiKey,
  baseURL: config.llmBaseUrl,
});

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("No JSON found in response: " + text.slice(0, 200));
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
  return response.choices[0].message.content;
}

export async function visionScore(imageUrl, originalPrompt) {
  const response = await openai.chat.completions.create({
    model: config.visionModel,
    messages: [
      {
        role: "system",
        content: `You are an expert AI image critic. Score the given image on four criteria, each 0-25 points (total 0-100).
- adherence: How well does the image match the original prompt?
- aesthetics: Visual appeal, composition, color harmony
- lighting: Quality of lighting, shadows, atmosphere
- creativity: Originality, interesting composition choices

Return JSON only: { adherence: number, aesthetics: number, lighting: number, creativity: number, total: number, reasoning: string }`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Original prompt: "${originalPrompt}"\nScore this generated image:` },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    temperature: 0.3,
  });
  return extractJSON(response.choices[0].message.content);
}
