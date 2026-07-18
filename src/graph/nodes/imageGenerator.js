import { generateImage } from "../../services/imageClient.js";

async function generateWithRetry(prompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = await generateImage(prompt);
      return { prompt, imageUrl: url, success: true };
    } catch (err) {
      console.error(`[ImageGen] Attempt ${attempt + 1} failed for prompt: "${prompt.slice(0, 40)}..."`, err.message);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  return { prompt, imageUrl: null, success: false, error: "all retries failed" };
}

export default async function imageGenerator(state) {
  const prompts = state.promptVariations;
  console.log(`[Node] image_generator — generating ${prompts.length} images sequentially`);

  const results = [];
  for (const p of prompts) {
    results.push(await generateWithRetry(p));
  }

  const images = results
    .filter((r) => r.success)
    .map((r) => ({ url: r.imageUrl, prompt: r.prompt }));

  console.log(`[Node] image_generator — ${images.length}/${prompts.length} succeeded`);

  return { generatedImages: images };
}
