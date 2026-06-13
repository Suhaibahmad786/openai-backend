import Replicate from "replicate";
import { config } from "../config.js";

const replicate = new Replicate({ auth: config.replicateApiToken });

export async function generateImage(prompt) {
  console.log(`[Replicate] Generating image for prompt: "${prompt.slice(0, 60)}..."`);

  const output = await replicate.run(config.replicateModel, {
    input: {
      prompt,
      num_outputs: 1,
      num_inference_steps: 4,
      aspect_ratio: "1:1",
      output_format: "webp",
    },
  });

  const imageUrl = Array.isArray(output) ? output[0] : output;
  console.log(`[Replicate] Image generated: ${imageUrl}`);
  return imageUrl;
}
