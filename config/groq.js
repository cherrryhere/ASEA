import Groq from "groq-sdk";

let groqClient = null;

export const groqConfig = {
  model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  temperature: 0.2,
  maxTokens: 8192
};

export function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is missing. Add GROQ_API_KEY to the .env file."
    );
  }

  if (!groqClient) {
    groqClient = new Groq({
      apiKey
    });
  }

  return groqClient;
}