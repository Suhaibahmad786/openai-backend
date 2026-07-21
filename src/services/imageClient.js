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
} catch {
  canWriteFs = false;
}

function buildPollinationsUrl(prompt, seed) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
}

function verifyInBackground(url) {
  fetch(url, { signal: AbortSignal.timeout(120000), redirect: "follow" })
    .then(async (resp) => {
      if (!resp.ok || !canWriteFs) return;
      const ct = resp.headers.get("content-type") || "";
      if (!ct.includes("image")) return;
      const buffer = Buffer.from(await resp.arrayBuffer());
      const ext = ct.includes("png") ? "png" : "jpg";
      const filename = `${crypto.randomUUID()}.${ext}`;
      fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
      console.log(`[ImageGen] Background save ok: ${filename}`);
    })
    .catch(() => {});
}

export function generateImage(prompt) {
  const seed = Math.floor(Math.random() * 1000000);
  const url = buildPollinationsUrl(prompt, seed);
  console.log(`[ImageGen] URL ready (seed=${seed}): "${prompt.slice(0, 60)}..."`);
  verifyInBackground(url);
  return url;
}
