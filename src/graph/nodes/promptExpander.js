import { chatJSON } from "../../services/openaiClient.js";

export default async function promptExpander(state) {
  console.log("[Node] prompt_expander — generating 3 variations");

  const systemPrompt = `You are a prompt engineer for flux-schnell AI image generation.
Given a user prompt and its analysis, produce exactly 3 distinct, high-quality prompt variations.
Each variation should differ in composition, lighting, or style approach.
Optimize for flux-schnell — shorter, vivid descriptions work best.

Return JSON: { variations: string[] } (array of exactly 3 strings)`;

  const userPrompt = `Original: "${state.originalPrompt}"
Analysis: ${JSON.stringify(state.intent, null, 2)}

Generate 3 optimized prompt variations.`;

  const result = await chatJSON(systemPrompt, userPrompt);

  console.log(`[Node] prompt_expander — generated ${result.variations.length} variations`);

  return { promptVariations: result.variations };
}
