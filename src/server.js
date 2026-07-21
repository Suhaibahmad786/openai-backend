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

const REQUEST_TIMEOUT_MS = 180_000;
app.use("/generate", (req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT_MS);
  res.setTimeout(REQUEST_TIMEOUT_MS);
  next();
});
app.use("/generated", express.static(path.resolve(__dirname, "../generated")));

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
    res.json(result);
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
      res.write(": heartbeat\n\n");
    } catch {}
  }, 10000);

  const cleanup = () => {
    clearInterval(heartbeat);
  };

  runWorkflow(prompt.trim(), {
    onNodeStart: (node) => sendEvent("node_start", { node }),
    onNodeEnd: (node) => sendEvent("node_end", { node }),
  })
    .then((result) => {
      sendEvent("complete", { result });
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
