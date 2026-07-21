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
  fs.unlinkSync(testFile);
} catch (e) {
  console.warn("[ImageGen] Filesystem not writable:", e.message);
  canWriteFs = false;
}

function buildPollinationsUrl(prompt, seed) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
}

async function fetchAndSave(pollinationsUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);

  try {
    const resp = await fetch(pollinationsUrl, {
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("image")) {
      throw new Error(`Response is not an image: ${ct}`);
    }

    const buffer = Buffer.from(await resp.arrayBuffer());

    if (!canWriteFs) {
      throw new Error("Filesystem not writable");
    }

    const ext = ct.includes("png") ? "png" : "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
    console.log(`[ImageGen] Saved: ${filename} (${buffer.length} bytes)`);
    return filename;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export function generateImage(prompt) {
  const seed = Math.floor(Math.random() * 1000000);
  const pollinationsUrl = buildPollinationsUrl(prompt, seed);
  console.log(`[ImageGen] Fetching (seed=${seed}): "${prompt.slice(0, 60)}..."`);

  return fetchAndSave(pollinationsUrl).catch((err) => {
    console.error(`[ImageGen] Fetch failed: ${err.message} — returning Pollinations URL as fallback`);
    return pollinationsUrl;
  });
}
