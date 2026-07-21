import Groq from "groq-sdk";

let groqClient = null;

function getPositiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(value, 10);

  if (
    Number.isInteger(parsedValue) &&
    parsedValue > 0
  ) {
    return parsedValue;
  }

  return fallbackValue;
}

function getTemperature(value, fallbackValue) {
  const parsedValue = Number(value);

  if (
    Number.isFinite(parsedValue) &&
    parsedValue >= 0 &&
    parsedValue <= 2
  ) {
    return parsedValue;
  }

  return fallbackValue;
}

export const groqConfig = {
  model:
    process.env.GROQ_MODEL ||
    "openai/gpt-oss-120b",

  temperature: getTemperature(
    process.env.GROQ_TEMPERATURE,
    0.2
  ),

  maxTokens: getPositiveInteger(
    process.env.GROQ_MAX_TOKENS,
    2048
  )
};

export function getGroqClient() {
  const apiKey =
    String(
      process.env.GROQ_API_KEY || ""
    ).trim();

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is missing. Add it to the .env file."
    );
  }

  if (!groqClient) {
    groqClient = new Groq({
      apiKey,
      maxRetries: 2,
      timeout: 60000
    });
  }

  return groqClient;
}