import { chatJSON } from "../../services/openaiClient.js";

export default async function promptExpander(state) {
  console.log("[Node] prompt_expander — generating 5 variations");

  const systemPrompt = `You are an expert prompt engineer for FLUX AI image generation.
Given a user prompt and its analysis, produce exactly 5 distinct, high-quality prompt variations.
Each variation should differ in composition, lighting, or style approach.
Be descriptive and vivid — FLUX responds well to detailed prompts.

Each variation MUST end with these quality tags: "8k, highly detailed, sharp focus, masterpiece, professional"

Avoid: blurry, low quality, distorted, watermark, text, deformed, ugly, disfigured.

Return JSON: { variations: string[] } (array of exactly 5 strings)`;

  const userPrompt = `Original: "${state.originalPrompt}"
Analysis: ${JSON.stringify(state.intent, null, 2)}

Generate 5 optimized prompt variations with quality tags.`;

  const result = await chatJSON(systemPrompt, userPrompt);

  console.log(`[Node] prompt_expander — generated ${result.variations.length} variations`);

  return { promptVariations: result.variations };
}
