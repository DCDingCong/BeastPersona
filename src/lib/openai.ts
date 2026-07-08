import OpenAI from "openai";
import {
  defaultImageModel,
  defaultTextModel,
  sanitizeOpenAISettings,
  type OpenAIRequestSettings,
  type ResolvedOpenAISettings,
} from "./openaiSettings";

export {
  sanitizeOpenAISettings,
  type OpenAIRequestSettings,
  type ResolvedOpenAISettings,
} from "./openaiSettings";

let client: OpenAI | null = null;

export function resolveOpenAISettings(
  settings?: OpenAIRequestSettings,
): ResolvedOpenAISettings {
  const sanitized = sanitizeOpenAISettings(settings);

  return {
    apiKey: sanitized.apiKey || process.env.OPENAI_API_KEY || undefined,
    baseURL: sanitized.baseURL || getOpenAIBaseURL(),
    textModel: sanitized.textModel || process.env.OPENAI_TEXT_MODEL || defaultTextModel,
    imageModel: sanitized.imageModel || process.env.OPENAI_IMAGE_MODEL || defaultImageModel,
  };
}

export function hasOpenAIKey(settings?: OpenAIRequestSettings) {
  return Boolean(resolveOpenAISettings(settings).apiKey);
}

export function getOpenAIClient(settings?: OpenAIRequestSettings) {
  const resolved = resolveOpenAISettings(settings);

  if (!resolved.apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (settings && Object.keys(sanitizeOpenAISettings(settings)).length > 0) {
    return new OpenAI({
      apiKey: resolved.apiKey,
      baseURL: resolved.baseURL,
    });
  }

  if (!client) {
    client = new OpenAI({
      apiKey: resolved.apiKey,
      baseURL: resolved.baseURL,
    });
  }

  return client;
}

export function getOpenAIBaseURL() {
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  return baseURL || undefined;
}

export function getTextModel() {
  return resolveOpenAISettings().textModel;
}

export function getImageModel() {
  return resolveOpenAISettings().imageModel;
}
