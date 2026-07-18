import { visionScore } from "../../services/openaiClient.js";

export default async function visionJudge(state) {
  const images = state.generatedImages;
  console.log(`[Node] vision_judge — scoring ${images.length} images`);

  const scoreResults = [];

  for (const img of images) {
    try {
      const score = await visionScore(img.url, state.originalPrompt);
      console.log(`[Node] vision_judge — score ${score.total}/100 for ${img.url.slice(-30)}`);
      scoreResults.push({ url: img.url, ...score });
    } catch (err) {
      console.error(`[Node] vision_judge — failed for ${img.url.slice(-30)}`, err.message);
      scoreResults.push({
        url: img.url,
        total: 0,
        breakdown: { adherence: 0, aesthetics: 0, lighting: 0, creativity: 0 },
        reasoning: "Scoring failed",
      });
    }
    if (images.indexOf(img) < images.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return { scores: scoreResults };
}
