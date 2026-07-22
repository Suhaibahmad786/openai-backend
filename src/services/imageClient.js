function buildPollinationsUrl(prompt, seed) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
}

export function generateImage(prompt) {
  const seed = Math.floor(Math.random() * 1000000);
  const url = buildPollinationsUrl(prompt, seed);
  console.log(`[ImageGen] URL (seed=${seed}): "${prompt.slice(0, 60)}..."`);
  return url;
}
