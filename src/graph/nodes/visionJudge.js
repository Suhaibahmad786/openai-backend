import { visionScore } from "../../services/openaiClient.js";

export default async function visionJudge(state) {
  const images = state.generatedImages;
  console.log(`[Node] vision_judge — scoring ${images.length} images`);

  const scoreResults = await Promise.all(
    images.map(async (img) => {
      try {
        const score = await visionScore(img.url, state.originalPrompt);
        console.log(`[Node] vision_judge — score ${score.total}/100 for ${img.url.slice(-20)}`);
        return { url: img.url, ...score };
      } catch (err) {
        console.error(`[Node] vision_judge — failed for ${img.url.slice(-20)}`, err.message);
        return {
          url: img.url,
          total: 0,
          breakdown: { adherence: 0, aesthetics: 0, lighting: 0, creativity: 0 },
          reasoning: "Scoring failed",
        };
      }
    })
  );

  return { scores: scoreResults };
}
