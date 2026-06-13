import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, "../../generated");

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

export async function generateImage(prompt) {
  console.log(`[ImageGen] Generating via Hugging Face for prompt: "${prompt.slice(0, 60)}..."`);

  const resp = await fetch(
    "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
    {
      headers: {
        Authorization: `Bearer ${config.hfToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HF ${resp.status}: ${text.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  const filename = `${crypto.randomUUID()}.webp`;
  const filepath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  const imageUrl = `${config.baseUrl}/generated/${filename}`;
  console.log(`[ImageGen] Image saved: ${imageUrl}`);
  return imageUrl;
}
