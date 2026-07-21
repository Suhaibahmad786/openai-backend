import { generateImage } from "../../services/imageClient.js";

export default async function imageGenerator(state) {
  const prompts = state.promptVariations;
  console.log(`[Node] image_generator — generating ${prompts.length} images`);

  const results = [];
  for (const p of prompts) {
    const result = await generateImage(p);
    if (!result) {
      console.log(`[Node] image_generator — failed for: "${p.slice(0, 40)}..."`);
      results.push({ url: null, prompt: p });
    } else if (result.startsWith("http")) {
      results.push({ url: result, prompt: p });
    } else {
      results.push({ url: `/generated/${result}`, prompt: p });
    }
  }

  const successCount = results.filter((r) => r.url).length;
  console.log(`[Node] image_generator — ${successCount}/${results.length} images ready`);

  return { generatedImages: results };
}
