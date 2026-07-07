import { quickQuestions } from "@/data/quickQuestions";
import { describe, expect, it } from "vitest";
import {
  getPreviousDeepQuestionId,
  getPreviousQuickQuestionIndex,
  getSelectedOptionId,
  popPreviousDeepQuestion,
  pushDeepQuestion,
  upsertAnswer,
} from "./questionnaireNavigation";

describe("questionnaire navigation", () => {
  it("replaces an existing answer and keeps it selectable when returning", () => {
    const question = quickQuestions[0];
    const first = upsertAnswer([], question, question.options[0].id);
    const second = upsertAnswer(first, question, question.options[1].id);

    expect(second).toHaveLength(1);
    expect(getSelectedOptionId(second, question.id)).toBe(question.options[1].id);
  });

  it("returns to the previous quick question instead of home when possible", () => {
    expect(getPreviousQuickQuestionIndex(3)).toBe(2);
    expect(getPreviousQuickQuestionIndex(0)).toBeNull();
  });

  it("tracks the previous deep question id for dynamic deep flows", () => {
    const stack = pushDeepQuestion([], "db01_intro_shot");

    expect(pushDeepQuestion(stack, "db01_intro_shot")).toEqual(stack);
    expect(getPreviousDeepQuestionId(stack)).toBe("db01_intro_shot");
    expect(popPreviousDeepQuestion(["db01_intro_shot", "db02_old_mark"])).toEqual({
      previousQuestionId: "db02_old_mark",
      nextStack: ["db01_intro_shot"],
    });
    expect(getPreviousDeepQuestionId([])).toBeNull();
  });
});
