import "dotenv/config";

export const config = {
  llmApiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  llmBaseUrl: process.env.GROQ_API_KEY
    ? "https://api.groq.com/openai/v1"
    : "https://api.openai.com/v1",
  hfToken: process.env.HF_TOKEN,
  textModel: process.env.GROQ_API_KEY
    ? "llama-3.3-70b-versatile"
    : "gpt-4o-mini",
  visionModel: process.env.GROQ_API_KEY
    ? "llama-3.2-90b-vision-preview"
    : "gpt-4o-mini",
  port: process.env.PORT || 4000,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
};
