import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, "../../generated");

let canWriteFs = true;
try {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
  const testFile = path.join(IMAGES_DIR, `.write-test-${Date.now()}`);
  fs.writeFileSync(testFile, "ok");
  fs.default?.unlinkSync?.(testFile) || fs.unlinkSync(testFile);
} catch {
  canWriteFs = false;
}

function buildPollinationsUrl(prompt, seed) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
}

function fetchImageBuffer(url, timeoutMs = 180_000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    fetch(url, { signal: controller.signal, redirect: "follow" })
      .then(async (resp) => {
        clearTimeout(timer);
        if (!resp.ok) return reject(new Error(`HTTP ${resp.status}`));
        const ct = resp.headers.get("content-type") || "";
        if (!ct.includes("image")) return reject(new Error(`Not an image: ${ct}`));
        const buffer = Buffer.from(await resp.arrayBuffer());
        resolve({ buffer, contentType: ct });
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function saveToDisk(buffer, contentType) {
  if (!canWriteFs) return null;
  const ext = contentType.includes("png") ? "png" : "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return filename;
}

export function generateImage(prompt) {
  const seed = Math.floor(Math.random() * 1000000);
  const pollinationsUrl = buildPollinationsUrl(prompt, seed);
  console.log(`[ImageGen] Fetching image (seed=${seed}): "${prompt.slice(0, 60)}..."`);
  console.log(`[ImageGen] URL: ${pollinationsUrl}`);

  const startTime = Date.now();

  return fetchImageBuffer(pollinationsUrl)
    .then(({ buffer, contentType }) => {
      const elapsed = Date.now() - startTime;
      console.log(`[ImageGen] Fetched ${buffer.length} bytes in ${elapsed}ms`);

      const filename = saveToDisk(buffer, contentType);
      if (filename) {
        console.log(`[ImageGen] Saved: ${filename}`);
      }

      return filename;
    })
    .catch((err) => {
      const elapsed = Date.now() - startTime;
      console.error(`[ImageGen] Failed after ${elapsed}ms: ${err.message}`);
      return null;
    });
}
