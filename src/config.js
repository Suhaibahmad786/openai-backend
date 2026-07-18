import "dotenv/config";

export const config = {
  llmApiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  llmBaseUrl: process.env.GROQ_API_KEY
    ? "https://api.groq.com/openai/v1"
    : "https://api.openai.com/v1",
  hfToken: process.env.HF_TOKEN,
  textModel: "qwen/qwen3.6-27b",
  visionModel: "qwen/qwen3.6-27b",
  port: process.env.PORT || 4000,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
};
