import { generateImage } from "../../services/imageClient.js";

export default async function imageGenerator(state) {
  const prompts = state.promptVariations;
  console.log(`[Node] image_generator — generating ${prompts.length} images`);

  const results = prompts.map((p) => {
    const url = generateImage(p);
    console.log(`[Node] image_generator — ready: "${p.slice(0, 40)}..."`);
    return { url, prompt: p };
  });

  console.log(`[Node] image_generator — ${results.length}/${results.length} images ready`);

  return { generatedImages: results };
}
