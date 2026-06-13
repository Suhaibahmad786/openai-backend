import { chatJSON } from "../../services/openaiClient.js";

export default async function intentAnalyzer(state) {
  console.log("[Node] intent_analyzer — analyzing prompt");

  const systemPrompt = `You are an expert prompt analyst for AI image generation.
Analyze the user's image prompt and return JSON with:
- subject: string (the main subject)
- style: string (art style, e.g., "cyberpunk", "oil painting", "photorealistic")
- mood: string (mood/atmosphere)
- keyVisualElements: string[] (list of important visual elements)`;

  const result = await chatJSON(systemPrompt, `Analyze this prompt: "${state.originalPrompt}"`);

  console.log(`[Node] intent_analyzer — subject: ${result.subject}, style: ${result.style}`);

  return { intent: result };
}
