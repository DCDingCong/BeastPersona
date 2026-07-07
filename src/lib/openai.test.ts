import { afterEach, describe, expect, it } from "vitest";
import { getOpenAIBaseURL } from "./openai";

const originalBaseURL = process.env.OPENAI_BASE_URL;

afterEach(() => {
  process.env.OPENAI_BASE_URL = originalBaseURL;
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
