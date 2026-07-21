import { generateImage } from "../../services/imageClient.js";

export default async function imageGenerator(state) {
  const prompts = state.promptVariations;
  console.log(`[Node] image_generator — generating ${prompts.length} images`);

  const results = await Promise.all(
    prompts.map(async (p) => {
      const filename = await generateImage(p);
      if (!filename) {
        console.log(`[Node] image_generator — failed for: "${p.slice(0, 40)}..."`);
        return { url: null, prompt: p };
      }
      return { url: `/generated/${filename}`, prompt: p };
    })
  );

  const successCount = results.filter((r) => r.url).length;
  console.log(`[Node] image_generator — ${successCount}/${results.length} images ready`);

  return { generatedImages: results };
}
