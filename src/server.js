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

const PORT = process.env.PORT || config.port || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🎨 AI Image Studio backend running on port ${PORT}`);
});
