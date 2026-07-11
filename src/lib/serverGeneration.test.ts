import { beforeEach, describe, expect, it, vi } from "vitest";
import { quickQuestions } from "@/data/quickQuestions";
import type { GenerateRequest } from "@/lib/fursona";
import { scoreAnswers } from "@/lib/scoring";

const mocks = vi.hoisted(() => ({
  createResponse: vi.fn(),
  generateImage: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({
    responses: { create: mocks.createResponse },
    images: { generate: mocks.generateImage },
  }),
  hasOpenAIKey: () => true,
  resolveOpenAISettings: () => ({
    apiKey: "test-key",
    textModel: "test-text-model",
    imageModel: "test-image-model",
  }),
}));

import { generateCharacterDraft, generateSingleImage } from "./serverGeneration";

describe("generateCharacterDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the rule-engine specification when text generation fails", async () => {
    const answers = quickQuestions.map((question) => ({
      questionId: question.id,
      optionId: question.options[0].id,
    }));
    const request: GenerateRequest = {
      mode: "quick",
      lineageMode: "ai",
      answers,
      scoreSnapshot: scoreAnswers(answers),
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.createResponse.mockRejectedValue(new Error("upstream unavailable"));

    const result = await generateCharacterDraft(request);

    expect(result.primary_species).toBeTruthy();
    expect(result.height).toMatch(/^\d{2,3}cm$/);
    expect(result.prompts.complete_scene).toBeTruthy();
    expect(result.prompts.reference_sheet).toBeTruthy();
    expect(consoleError).toHaveBeenCalledWith(
      "Character draft generation failed; using rule-engine fallback.",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it("retries a transient image-provider failure", async () => {
    vi.useFakeTimers();
    mocks.generateImage
      .mockRejectedValueOnce(Object.assign(new Error("upstream unavailable"), { status: 503 }))
      .mockResolvedValueOnce({ data: [{ b64_json: "generated-image" }] });

    const resultPromise = generateSingleImage("draw a character");
    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe("data:image/png;base64,generated-image");
    expect(mocks.generateImage).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not retry a non-recoverable image request", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.generateImage.mockRejectedValue(
      Object.assign(new Error("invalid request"), { status: 400 }),
    );

    await expect(generateSingleImage("invalid prompt")).resolves.toBeNull();
    expect(mocks.generateImage).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
