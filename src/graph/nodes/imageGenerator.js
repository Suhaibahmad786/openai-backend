import { generateImage } from "../../services/imageClient.js";

async function generateWithRetry(prompt, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = await generateImage(prompt);
      return { prompt, imageUrl: url, success: true };
    } catch (err) {
      console.error(`[ImageGen] Attempt ${attempt + 1} failed for prompt: "${prompt.slice(0, 40)}..."`, err.message);
      if (attempt === retries) {
        return { prompt, imageUrl: null, success: false, error: err.message };
      }
    }
  }
}

export default async function imageGenerator(state) {
  const prompts = state.promptVariations;
  console.log(`[Node] image_generator — generating ${prompts.length} images in parallel`);

  const results = await Promise.all(prompts.map((p) => generateWithRetry(p)));

  const images = results
    .filter((r) => r.success)
    .map((r) => ({ url: r.imageUrl, prompt: r.prompt }));

  console.log(`[Node] image_generator — ${images.length}/${prompts.length} succeeded`);

  return { generatedImages: images };
}
