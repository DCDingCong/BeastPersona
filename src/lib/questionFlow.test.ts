import { deepQuestionBank } from "@/data/deepQuestionBank";
import { selectDeepQuestions } from "@/lib/questionFlow";
import { describe, expect, it } from "vitest";

describe("deepQuestionBank", () => {
  it("contains all required branch groups", () => {
    const branches = new Set(deepQuestionBank.map((question) => question.branch));

    expect(branches.has("base")).toBe(true);
    expect(branches.has("lineage")).toBe(true);
    expect(branches.has("mammal")).toBe(true);
    expect(branches.has("mythic")).toBe(true);
    expect(branches.has("special")).toBe(true);
    expect(branches.has("visual")).toBe(true);
    expect(branches.has("world")).toBe(true);
    expect(branches.has("constraints")).toBe(true);
  });

  it("keeps base branch fixed at 8 questions", () => {
    expect(deepQuestionBank.filter((question) => question.branch === "base")).toHaveLength(8);
  });

  it("can grow beyond the initial sample size without changing flow limits", () => {
    expect(deepQuestionBank.length).toBeGreaterThanOrEqual(48);
  });
});

describe("selectDeepQuestions", () => {
  it("starts with the 8 base questions", () => {
    const questions = selectDeepQuestions([], "standard");
    expect(questions).toHaveLength(8);
    expect(questions.every((question) => question.branch === "base")).toBe(true);
  });

  it("selects mythic branch after scale and mythic leaning answers", () => {
    const questions = selectDeepQuestions(
      [
        { questionId: "db01_intro_shot", optionId: "high_view", branch: "base" },
        { questionId: "db02_old_mark", optionId: "rune_mark", branch: "base" },
        { questionId: "db03_hidden_part", optionId: "ears_or_horns", branch: "base" },
        { questionId: "db04_silent_signal", optionId: "tidy_objects", branch: "base" },
        { questionId: "db05_origin_place", optionId: "cloud_altar", branch: "base" },
        { questionId: "db06_action_style", optionId: "observe_then_move", branch: "base" },
        { questionId: "db07_danger_source", optionId: "old_rule", branch: "base" },
        { questionId: "db08_first_impression", optionId: "abnormal", branch: "base" },
      ],
      "standard",
    );

    expect(questions.some((question) => question.branch === "mythic")).toBe(true);
  });

  it("does not exceed configured standard depth", () => {
    const questions = selectDeepQuestions([], "standard");
    expect(questions.length).toBeLessThanOrEqual(28);
  });
});
