import { visionScore } from "../../services/openaiClient.js";

export default async function visionJudge(state) {
  const images = state.generatedImages;
  const validImages = images.filter((img) => img.url);
  console.log(`[Node] vision_judge — scoring ${validImages.length} images`);

  const scoreResults = [];

  for (const img of validImages) {
    try {
      const score = await visionScore(img.url, state.originalPrompt);
      console.log(`[Node] vision_judge — score ${score.total}/100`);
      scoreResults.push({ url: img.url, ...score });
    } catch (err) {
      console.error(`[Node] vision_judge — failed:`, err.message);
      scoreResults.push({
        url: img.url,
        total: 0,
        breakdown: { adherence: 0, aesthetics: 0, lighting: 0, creativity: 0 },
        reasoning: "Scoring failed",
      });
    }
    if (validImages.indexOf(img) < validImages.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return { scores: scoreResults };
}
