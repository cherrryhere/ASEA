import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

export const groqConfig = {
  model: "llama-3.3-70b-versatile",
  temperature: 0.2
};

export function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is missing. Please add GROQ_API_KEY=your_key_here in the .env file."
    );
  }

  return new Groq({
    apiKey
  });
}