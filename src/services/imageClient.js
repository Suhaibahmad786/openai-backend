import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, "../../generated");

let canWriteFs = true;
try {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
  const testFile = path.join(IMAGES_DIR, `.write-test-${Date.now()}`);
  fs.writeFileSync(testFile, "ok");
  fs.unlinkSync(testFile);
} catch {
  console.warn("[ImageGen] Filesystem not writable — using Pollinations URLs directly");
  canWriteFs = false;
}

export async function generateImage(prompt) {
  const seed = Math.floor(Math.random() * 1000000);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
  console.log(`[ImageGen] Generating via Pollinations for prompt: "${prompt.slice(0, 60)}..."`);

  const resp = await fetch(pollinationsUrl, { method: "GET", signal: AbortSignal.timeout(60000) });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Pollinations ${resp.status}: ${text.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());

  if (!canWriteFs) {
    console.log(`[ImageGen] Serving via Pollinations URL (seed=${seed})`);
    return pollinationsUrl;
  }

  const contentType = resp.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  const imageUrl = `${config.baseUrl}/generated/${filename}`;
  console.log(`[ImageGen] Image saved: ${imageUrl}`);
  return imageUrl;
}
