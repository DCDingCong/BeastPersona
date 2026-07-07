import { deepQuestionBank } from "@/data/deepQuestionBank";
import { quickQuestions } from "@/data/quickQuestions";
import { scoreAnswers } from "@/lib/scoring";
import { describe, expect, it } from "vitest";
import { validateQuestionBank, validateScoringData } from "./questionBankValidation";

describe("question bank validation", () => {
  it("keeps every question score attached to a registered tag", () => {
    const issues = validateQuestionBank([...quickQuestions, ...deepQuestionBank]);

    expect(issues).toEqual([]);
  });

  it("keeps scoring rules and species trait weights attached to registered tags", () => {
    expect(validateScoringData()).toEqual([]);
  });

  it("routes every option score into scoreAnswers tags", () => {
    for (const question of [...quickQuestions, ...deepQuestionBank]) {
      for (const option of question.options) {
        const snapshot = scoreAnswers([
          { questionId: question.id, optionId: option.id, branch: question.branch },
        ]);

        for (const [tag, value] of Object.entries(option.scores)) {
          expect(snapshot.tags[tag], `${question.id}.${option.id}.${tag}`).toBe(value);
        }
      }
    }
  });
});
