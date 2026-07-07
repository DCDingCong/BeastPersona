import { combinationBoosts } from "@/data/scoringRules";
import { registeredScoreTags } from "@/data/scoreTags";
import { speciesTraitWeights } from "@/data/species";
import type { Question } from "@/data/questionTypes";

export type QuestionBankValidationIssue = {
  path: string;
  message: string;
};

export function validateQuestionBank(questions: Question[]) {
  const issues: QuestionBankValidationIssue[] = [];
  const questionIds = new Set<string>();

  for (const question of questions) {
    const questionPath = question.id || "<missing-question-id>";

    if (!question.id.trim()) {
      issues.push({ path: questionPath, message: "Question id is required." });
    } else if (questionIds.has(question.id)) {
      issues.push({ path: questionPath, message: "Question id must be unique." });
    }
    questionIds.add(question.id);

    if (!question.title.trim()) {
      issues.push({ path: questionPath, message: "Question title is required." });
    }

    if (question.options.length < 2) {
      issues.push({ path: questionPath, message: "Question needs at least two options." });
    }

    const optionIds = new Set<string>();
    for (const option of question.options) {
      const optionPath = `${questionPath}.${option.id || "<missing-option-id>"}`;

      if (!option.id.trim()) {
        issues.push({ path: optionPath, message: "Option id is required." });
      } else if (optionIds.has(option.id)) {
        issues.push({ path: optionPath, message: "Option id must be unique within its question." });
      }
      optionIds.add(option.id);

      if (!option.label.trim()) {
        issues.push({ path: optionPath, message: "Option label is required." });
      }

      validateScores(option.scores, optionPath, issues);
    }
  }

  return issues;
}

export function validateScoringData() {
  const issues: QuestionBankValidationIssue[] = [];

  combinationBoosts.forEach((rule, index) => {
    validateScores(rule.when, `combinationBoosts[${index}].when`, issues);
    validateScores(rule.add, `combinationBoosts[${index}].add`, issues);
  });

  for (const [species, weights] of Object.entries(speciesTraitWeights)) {
    validateScores(weights, `speciesTraitWeights.${species}`, issues);
  }

  return issues;
}

function validateScores(
  scores: Partial<Record<string, number>>,
  path: string,
  issues: QuestionBankValidationIssue[],
) {
  const entries = Object.entries(scores);

  if (entries.length === 0) {
    issues.push({ path, message: "Scores must include at least one registered tag." });
  }

  for (const [tag, value] of entries) {
    if (!registeredScoreTags.has(tag)) {
      issues.push({ path: `${path}.scores.${tag}`, message: "Score tag is not registered." });
    }

    if (!Number.isFinite(value) || value === 0) {
      issues.push({ path: `${path}.scores.${tag}`, message: "Score value must be a non-zero finite number." });
    }
  }
}
