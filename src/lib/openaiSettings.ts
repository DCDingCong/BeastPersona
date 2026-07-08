export type OpenAIRequestSettings = {
  apiKey?: string;
  baseURL?: string;
  textModel?: string;
  imageModel?: string;
};

export type ResolvedOpenAISettings = {
  apiKey?: string;
  baseURL?: string;
  textModel: string;
  imageModel: string;
};

export const defaultTextModel = "gpt-4.1-mini";
export const defaultImageModel = "gpt-image-2";

export function sanitizeOpenAISettings(
  settings?: OpenAIRequestSettings,
): OpenAIRequestSettings {
  if (!settings) return {};

  return Object.fromEntries(
    Object.entries(settings)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""])
      .filter(([, value]) => value),
  ) as OpenAIRequestSettings;
}
