import { generateImage } from "../../services/imageClient.js";

export default async function imageGenerator(state) {
  const prompts = state.promptVariations;
  console.log(`[Node] image_generator — generating ${prompts.length} images`);

  const images = prompts.map((p) => {
    const url = generateImage(p);
    return { url, prompt: p };
  });

  console.log(`[Node] image_generator — ${images.length} URLs generated`);

  return { generatedImages: images };
}
