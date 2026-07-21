import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { runWorkflow } from "./graph/workflow.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/test-image", async (_, res) => {
  const result = { pollinations: "unknown" };
  try {
    const url = "https://image.pollinations.ai/prompt/cat?width=128&height=128&nologo=true&seed=1";
    console.log("[Test] Fetching Pollinations...");
    const resp = await fetch(url, { signal: AbortSignal.timeout(90000), redirect: "follow" });
    result.pollinations = resp.ok ? "ok" : `fail: HTTP ${resp.status}`;
    result.contentType = resp.headers.get("content-type");
    result.contentLength = resp.headers.get("content-length");
  } catch (e) {
    result.pollinations = "fail: " + e.message;
  }
  res.json(result);
});

const REQUEST_TIMEOUT_MS = 600_000;
app.use("/generate", (req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT_MS);
  res.setTimeout(REQUEST_TIMEOUT_MS);
  next();
});
app.use("/proxy-image", (req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT_MS);
  res.setTimeout(REQUEST_TIMEOUT_MS);
  next();
});
app.use("/generated", express.static(path.resolve(__dirname, "../generated")));

app.get("/proxy-image", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl || !imageUrl.startsWith("https://image.pollinations.ai/")) {
    return res.status(400).json({ error: "Invalid or missing Pollinations URL" });
  }
  const MAX_TIME = 180_000;
  const startTime = Date.now();
  try {
    console.log(`[Proxy] Fetching: ${imageUrl.slice(0, 120)}...`);
    let resp;
    for (let attempt = 0; attempt < 3; attempt++) {
      resp = await fetch(imageUrl, {
        signal: AbortSignal.timeout(MAX_TIME),
        redirect: "follow",
      });
      const ct = resp.headers.get("content-type") || "";
      if (resp.ok && ct.includes("image")) break;
      if (resp.ok && !ct.includes("image")) {
        console.log(`[Proxy] Got non-image response (${ct}), retrying in 5s...`);
        resp.body?.cancel();
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      console.log(`[Proxy] Got HTTP ${resp.status}, retrying in 5s...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
    if (!resp || !resp.ok) {
      return res.status(502).json({ error: `Upstream failed after retries` });
    }
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    if (!contentType.includes("image")) {
      return res.status(502).json({ error: `Upstream returned non-image: ${contentType}` });
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const buffer = Buffer.from(await resp.arrayBuffer());
    const elapsed = Date.now() - startTime;
    console.log(`[Proxy] OK — ${buffer.length} bytes, ${contentType}, ${elapsed}ms`);
    res.send(buffer);
  } catch (e) {
    console.error(`[Proxy] Failed: ${e.message}`);
    res.status(502).json({ error: `Proxy fetch failed: ${e.message}` });
  }
});

function resolveImageUrl(url, req) {
  if (!url) return url;
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["host"] || `localhost:${config.port}`;
  const base = `${proto}://${host}`;
  if (url.startsWith("http")) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function wrapResultUrls(result, req) {
  if (!result) return result;
  const wrapped = { ...result };
  if (wrapped.bestImageUrl) {
    wrapped.bestImageUrl = resolveImageUrl(wrapped.bestImageUrl, req);
  }
  if (wrapped.allCandidates && Array.isArray(wrapped.allCandidates)) {
    wrapped.allCandidates = wrapped.allCandidates.map((c) => ({
      ...c,
      url: resolveImageUrl(c.url, req),
    }));
  }
  return wrapped;
}

app.get("/", (_, res) => res.json({ status: "ok", service: "ai-image-studio-backend" }));

app.get("/test", async (_, res) => {
  const results = { filesystem: "unknown", pollinations: "unknown", groq: "unknown" };

  try {
    const fs = await import("fs");
    const testPath = path.resolve(__dirname, "../generated/.test");
    fs.default.writeFileSync(testPath, "ok");
    fs.default.unlinkSync(testPath);
    results.filesystem = "ok";
  } catch (e) {
    results.filesystem = "fail: " + e.message;
  }

  try {
    const resp = await fetch("https://image.pollinations.ai/prompt/cat?width=128&height=128&nologo=true&seed=1", { signal: AbortSignal.timeout(30000) });
    results.pollinations = resp.ok ? "ok" : `fail: HTTP ${resp.status}`;
  } catch (e) {
    results.pollinations = "fail: " + e.message;
  }

  try {
    const { chatJSON } = await import("./services/openaiClient.js");
    const r = await chatJSON("Return JSON: {\"ok\": true}", "Just return ok true");
    results.groq = r.ok === true ? "ok" : "fail: unexpected response";
  } catch (e) {
    results.groq = "fail: " + e.message;
  }

  results.env = {
    GROQ_API_KEY: config.llmApiKey ? "set" : "missing",
    BASE_URL: config.baseUrl,
  };

  res.json(results);
});

app.get("/test-workflow", async (_, res) => {
  const steps = [];
  try {
    const { chatJSON } = await import("./services/openaiClient.js");
    steps.push({ step: "groq_import", status: "ok" });

    const { generateImage } = await import("./services/imageClient.js");
    steps.push({ step: "image_import", status: "ok" });

    steps.push({ step: "intent", status: "running" });
    const intent = await chatJSON("Return JSON with subject, style, mood, keyVisualElements", 'Analyze: "a cute cat"');
    steps[steps.length - 1] = { step: "intent", status: "ok", result: intent };

    steps.push({ step: "prompt_expand", status: "running" });
    const expanded = await chatJSON('Return JSON: { "variations": ["...","...","..."] }', `Original: "a cute cat"\nAnalysis: ${JSON.stringify(intent)}\nGenerate 3 prompt variations.`);
    steps[steps.length - 1] = { step: "prompt_expand", status: "ok", variations: expanded.variations };

    steps.push({ step: "image_gen_1", status: "running" });
    const imgUrl = generateImage(expanded.variations[0]);
    steps[steps.length - 1] = { step: "image_gen_1", status: "ok", url: imgUrl };

    res.json({ status: steps.every(s => s.status === "ok") ? "all_passed" : "failed", steps });
  } catch (e) {
    res.json({ status: "failed", steps, error: e.message });
  }
});

app.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "A non-empty 'prompt' field is required." });
  }

  console.log(`\n[Server] POST /generate — prompt: "${prompt}"`);

  try {
    const result = await runWorkflow(prompt.trim());
    console.log("[Server] ✅ Generation complete\n");
    if (result && result.error) {
      console.log("[Server] ⚠️ Workflow returned error:", result.error);
    }
    res.json(wrapResultUrls(result, req));
  } catch (err) {
    console.error("[Server] ❌ Workflow failed:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

app.get("/generate/stream", (req, res) => {
  const prompt = req.query.prompt;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "A non-empty 'prompt' query parameter is required." });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const sendEvent = (stage, data) => {
    res.write(`event: ${stage}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("log", { message: "Starting AI Image Studio pipeline..." });

  const heartbeat = setInterval(() => {
    try {
      if (!res.writableEnded) {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      }
    } catch (e) {
      console.warn("[SSE] Heartbeat write failed:", e.message);
    }
  }, 5000);

  const cleanup = () => {
    clearInterval(heartbeat);
  };

  runWorkflow(prompt.trim(), {
    onNodeStart: (node) => sendEvent("node_start", { node }),
    onNodeEnd: (node) => sendEvent("node_end", { node }),
  })
    .then((result) => {
      sendEvent("complete", { result: wrapResultUrls(result, req) });
      cleanup();
      res.end();
    })
    .catch((err) => {
      sendEvent("error", { error: err.message });
      cleanup();
      res.end();
    });

  req.on("close", cleanup);
});

const PORT = config.port;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🎨 AI Image Studio backend running on port ${PORT}`);
});
