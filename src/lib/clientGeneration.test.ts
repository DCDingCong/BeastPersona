import { describe, expect, it, vi } from "vitest";
import {
  buildOpenAIEndpoint,
  canUseClientGeneration,
  generateClientImage,
} from "./clientGeneration";

describe("buildOpenAIEndpoint", () => {
  it("joins custom OpenAI-compatible base URLs without duplicate slashes", () => {
    expect(buildOpenAIEndpoint(" https://example.test/v1/ ", "/images/generations")).toBe(
      "https://example.test/v1/images/generations",
    );
  });

  it("uses OpenAI's default v1 endpoint when no base URL is configured", () => {
    expect(buildOpenAIEndpoint(undefined, "/images/generations")).toBe(
      "https://api.openai.com/v1/images/generations",
    );
  });
});

describe("canUseClientGeneration", () => {
  it("requires a user-provided key for browser or Android direct generation", () => {
    expect(canUseClientGeneration({ apiKey: "" })).toBe(false);
    expect(canUseClientGeneration({ apiKey: " sk-test " })).toBe(true);
  });
});

describe("generateClientImage", () => {
  it("posts to an OpenAI-compatible image endpoint with sanitized settings", async () => {
    const postJson = vi.fn(async () => ({
      data: [{ b64_json: "abc123" }],
    }));

    await expect(
      generateClientImage(
        "draw a character",
        {
          apiKey: " sk-test ",
          baseURL: " https://example.test/v1/ ",
          imageModel: " image-model ",
        },
        postJson,
      ),
    ).resolves.toBe("data:image/png;base64,abc123");

    expect(postJson).toHaveBeenCalledWith(
      "https://example.test/v1/images/generations",
      {
        model: "image-model",
        prompt: "draw a character",
        size: "1024x1536",
        quality: "medium",
        output_format: "png",
        n: 1,
      },
      "sk-test",
    );
  });
});
