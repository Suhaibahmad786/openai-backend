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

export async function generateImage(prompt) {
  const seed = Math.floor(Math.random() * 1000000);
  const url = buildPollinationsUrl(prompt, seed);
  console.log(`[ImageGen] URL ready (seed=${seed}): "${prompt.slice(0, 60)}..."`);

  try {
    const resp = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(90000),
      redirect: "follow",
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("image") && canWriteFs) {
      try {
        const buffer = Buffer.from(await resp.arrayBuffer());
        const ext = ct.includes("png") ? "png" : "jpg";
        const filename = `${crypto.randomUUID()}.${ext}`;
        fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
        console.log(`[ImageGen] Image verified and saved`);
      } catch {
        console.warn(`[ImageGen] Save failed, URL still valid`);
      }
    }

    return url;
  } catch (err) {
    console.warn(`[ImageGen] Verification fetch failed: ${err.message} — returning URL anyway`);
    return url;
  }
}
