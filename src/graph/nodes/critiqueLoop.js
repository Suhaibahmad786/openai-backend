import { chat } from "../../services/openaiClient.js";

export default async function critiqueLoop(state) {
  const best = state.bestImage;
  console.log(`[Node] critique_loop — refining prompt (attempt ${state.attemptCount + 1})`);

  const systemPrompt = `You are an expert prompt engineer improving AI image generation.
Given the original prompt, the best image's score breakdown, and the judge's reasoning,
generate ONE improved prompt that addresses the weaknesses.
The new prompt should be vivid, optimized for flux-schnell, and directly fix the issues mentioned.

Return ONLY the improved prompt text, no JSON, no explanation.`;

  const userPrompt = `Original prompt: "${state.originalPrompt}"
Best image score: ${best.score}/100
Breakdown:
- Adherence: ${best.breakdown.adherence}/25
- Aesthetics: ${best.breakdown.aesthetics}/25
- Lighting: ${best.breakdown.lighting}/25
- Creativity: ${best.breakdown.creativity}/25
Judge reasoning: "${best.reasoning}"

Generate ONE improved prompt.`;

  const improvedPrompt = await chat(systemPrompt, userPrompt);

  console.log(`[Node] critique_loop — improved prompt: "${improvedPrompt.slice(0, 60)}..."`);

  return {
    promptVariations: [improvedPrompt.trim()],
    attemptCount: state.attemptCount + 1,
  };
}
