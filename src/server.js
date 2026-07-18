import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { runWorkflow } from "./graph/workflow.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
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

app.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "A non-empty 'prompt' field is required." });
  }

  console.log(`\n[Server] POST /generate — prompt: "${prompt}"`);

  try {
    const result = await runWorkflow(prompt.trim());
    console.log("[Server] ✅ Generation complete\n");
    res.json(result);
  } catch (err) {
    console.error("[Server] ❌ Workflow failed:", err);
    res.status(500).json({ error: err.message || "Internal server error", stack: err.stack });
  }
});

app.get("/generate/stream", (req, res) => {
  const prompt = req.query.prompt;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "A non-empty 'prompt' query parameter is required." });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const sendEvent = (stage, data) => {
    res.write(`event: ${stage}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("log", { message: "Starting AI Image Studio pipeline..." });

  runWorkflow(prompt.trim(), {
    onNodeStart: (node) => sendEvent("node_start", { node }),
    onNodeEnd: (node) => sendEvent("node_end", { node }),
  })
    .then((result) => {
      sendEvent("complete", { result });
      res.end();
    })
    .catch((err) => {
      sendEvent("error", { error: err.message });
      res.end();
    });
});

const PORT = config.port;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🎨 AI Image Studio backend running on port ${PORT}`);
});
