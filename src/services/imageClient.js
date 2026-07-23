const imageCache = new Map();

export async function fetchAndCacheImage(pollinationsUrl) {
  if (imageCache.has(pollinationsUrl)) {
    return imageCache.get(pollinationsUrl);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);

  try {
    const resp = await fetch(pollinationsUrl, {
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("image")) throw new Error(`Not an image: ${ct}`);

    const buffer = Buffer.from(await resp.arrayBuffer());
    const entry = { buffer, contentType: ct };
    imageCache.set(pollinationsUrl, entry);
    console.log(`[ImageGen] Cached: ${buffer.length} bytes`);
    return entry;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export function getCachedImage(url) {
  return imageCache.get(url) || null;
}

export function buildPollinationsUrl(prompt, seed) {
  const negative = "worst quality, blurry, low quality, distorted, watermark, text, deformed, ugly, disfigured";
  const params = new URLSearchParams({
    width: "1536",
    height: "1536",
    nologo: "true",
    seed: String(seed),
    model: "flux",
    negative_prompt: negative,
    quality: "high",
    enhance: "true",
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export function generateImage(prompt) {
  const seed = Math.floor(Math.random() * 1000000);
  const url = buildPollinationsUrl(prompt, seed);
  console.log(`[ImageGen] URL (seed=${seed}): "${prompt.slice(0, 60)}..."`);
  return url;
}
