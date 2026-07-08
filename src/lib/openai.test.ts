import { afterEach, describe, expect, it } from "vitest";
import {
  getOpenAIBaseURL,
  resolveOpenAISettings,
  sanitizeOpenAISettings,
} from "./openai";

const originalBaseURL = process.env.OPENAI_BASE_URL;
const originalApiKey = process.env.OPENAI_API_KEY;
const originalTextModel = process.env.OPENAI_TEXT_MODEL;
const originalImageModel = process.env.OPENAI_IMAGE_MODEL;

afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey;
  process.env.OPENAI_BASE_URL = originalBaseURL;
  process.env.OPENAI_TEXT_MODEL = originalTextModel;
  process.env.OPENAI_IMAGE_MODEL = originalImageModel;
});

describe("getOpenAIBaseURL", () => {
  it("returns undefined when no custom request base URL is configured", () => {
    delete process.env.OPENAI_BASE_URL;

    expect(getOpenAIBaseURL()).toBeUndefined();
  });

  it("returns the trimmed OpenAI-compatible request base URL from env", () => {
    process.env.OPENAI_BASE_URL = " https://api.openai.com/v1 ";

    expect(getOpenAIBaseURL()).toBe("https://api.openai.com/v1");
  });
});

describe("sanitizeOpenAISettings", () => {
  it("trims request settings and removes empty values", () => {
    expect(
      sanitizeOpenAISettings({
        apiKey: " sk-test ",
        baseURL: " https://example.test/v1 ",
        textModel: " gpt-4.1-mini ",
        imageModel: "   ",
      }),
    ).toEqual({
      apiKey: "sk-test",
      baseURL: "https://example.test/v1",
      textModel: "gpt-4.1-mini",
    });
  });
});

describe("resolveOpenAISettings", () => {
  it("prefers request settings and falls back to environment defaults", () => {
    process.env.OPENAI_API_KEY = "env-key";
    process.env.OPENAI_BASE_URL = "https://env.example/v1";
    process.env.OPENAI_TEXT_MODEL = "env-text";
    process.env.OPENAI_IMAGE_MODEL = "env-image";

    expect(
      resolveOpenAISettings({
        apiKey: " request-key ",
        baseURL: " https://request.example/v1 ",
        textModel: " request-text ",
      }),
    ).toEqual({
      apiKey: "request-key",
      baseURL: "https://request.example/v1",
      textModel: "request-text",
      imageModel: "env-image",
    });
  });

  it("uses built-in model defaults when neither request nor env provides models", () => {
    process.env.OPENAI_API_KEY = "env-key";
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_TEXT_MODEL;
    delete process.env.OPENAI_IMAGE_MODEL;

    expect(resolveOpenAISettings()).toEqual({
      apiKey: "env-key",
      baseURL: undefined,
      textModel: "gpt-4.1-mini",
      imageModel: "gpt-image-2",
    });
  });
});
