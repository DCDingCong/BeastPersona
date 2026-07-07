import OpenAI from "openai";

let client: OpenAI | null = null;

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: getOpenAIBaseURL(),
    });
  }

  return client;
}

export function getOpenAIBaseURL() {
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  return baseURL || undefined;
}

export function getTextModel() {
  return process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";
}

export function getImageModel() {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
}
