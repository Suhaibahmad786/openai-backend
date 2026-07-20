import { generateImage } from "../../services/imageClient.js";

export default async function imageGenerator(state) {
  const prompts = state.promptVariations;
  console.log(`[Node] image_generator — generating ${prompts.length} images`);

  const results = [];
  for (const p of prompts) {
    try {
      const url = await generateImage(p);
      results.push({ prompt: p, imageUrl: url, success: true });
    } catch (err) {
      console.error(`[ImageGen] Failed for "${p.slice(0, 40)}...":`, err.message);
      results.push({ prompt: p, imageUrl: null, success: false, error: err.message });
    }
  }

  const images = results
    .filter((r) => r.success)
    .map((r) => ({ url: r.imageUrl, prompt: r.prompt }));

  console.log(`[Node] image_generator — ${images.length}/${prompts.length} succeeded`);

  return { generatedImages: images };
}
