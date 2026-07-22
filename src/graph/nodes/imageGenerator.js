import { generateImage, fetchAndCacheImage } from "../../services/imageClient.js";

export default async function imageGenerator(state) {
  const prompts = state.promptVariations;
  console.log(`[Node] image_generator — generating ${prompts.length} images`);

  const results = await Promise.allSettled(
    prompts.map(async (p) => {
      const url = generateImage(p);
      await fetchAndCacheImage(url);
      return { url, prompt: p };
    })
  );

  const success = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((r) => console.error(`[Node] image_generator — failed:`, r.reason?.message));

  console.log(`[Node] image_generator — ${success.length}/${results.length} images ready`);

  return { generatedImages: success };
}
