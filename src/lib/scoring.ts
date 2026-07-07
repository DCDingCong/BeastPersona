import { deepQuestionBank } from "@/data/deepQuestionBank";
import { quickQuestions } from "@/data/quickQuestions";
import { combinationBoosts, lineageThresholds } from "@/data/scoringRules";
import { speciesByKey, speciesKeys, speciesTraitWeights } from "@/data/species";
import type { Answer, Question, QuestionOption } from "@/data/questionTypes";

export type SpeciesCandidate = {
  key: string;
  species: string;
  score: number;
};

export type ScoreSnapshot = {
  tags: Record<string, number>;
  speciesCandidates: SpeciesCandidate[];
  lineageScores: {
    pure: number;
    hybrid: number;
  };
  lineageRecommendation: "pure" | "hybrid";
  selectedEffects: {
    missions: string[];
    palettes: string[];
    roles: string[];
    mustKeep: string[];
    avoid: string[];
    promptHints: string[];
  };
};

const allQuestions: Question[] = [...quickQuestions, ...deepQuestionBank];

export function scoreAnswers(answers: Answer[] = []): ScoreSnapshot {
  const tags: Record<string, number> = {};
  const selectedEffects: ScoreSnapshot["selectedEffects"] = {
    missions: [],
    palettes: [],
    roles: [],
    mustKeep: [],
    avoid: [],
    promptHints: [],
  };

  for (const answer of answers) {
    const option = findOption(answer);
    if (!option) continue;

    for (const [key, value] of Object.entries(option.scores)) {
      tags[key] = roundScore((tags[key] || 0) + value);
    }

    if (option.effects?.mission) selectedEffects.missions.push(option.effects.mission);
    if (option.effects?.palette) selectedEffects.palettes.push(option.effects.palette);
    if (option.effects?.role) selectedEffects.roles.push(option.effects.role);
    selectedEffects.mustKeep.push(...(option.effects?.mustKeep || []));
    selectedEffects.avoid.push(...(option.effects?.avoid || []));
    selectedEffects.promptHints.push(...(option.effects?.promptHints || []));
  }

  applyCombinationBoosts(tags);

  const speciesCandidates = rankSpecies(tags);
  const lineageScores = buildLineageScores(tags, speciesCandidates);
  const lineageRecommendation = recommendLineage(lineageScores);

  return {
    tags,
    speciesCandidates,
    lineageScores,
    lineageRecommendation,
    selectedEffects: uniqueEffects(selectedEffects),
  };
}

function findOption(answer: Answer): QuestionOption | undefined {
  const question = allQuestions.find((item) => item.id === answer.questionId);
  return question?.options.find((option) => option.id === answer.optionId);
}

function applyCombinationBoosts(tags: Record<string, number>) {
  for (const rule of combinationBoosts) {
    const matched = Object.entries(rule.when).every(
      ([key, min]) => (tags[key] || 0) >= min,
    );

    if (!matched) continue;

    for (const [key, value] of Object.entries(rule.add)) {
      tags[key] = roundScore((tags[key] || 0) + value);
    }
  }
}

export function rankSpecies(tags: Record<string, number>): SpeciesCandidate[] {
  return speciesKeys
    .map((key) => {
      const direct = tags[key] || 0;
      const trait = Object.entries(speciesTraitWeights[key] || {}).reduce(
        (total, [tag, weight]) => total + (tags[tag] || 0) * weight,
        0,
      );
      const roleFactor = key === "mech" ? 0.55 : 1;

      return {
        key,
        species: speciesByKey[key],
        score: roundScore((direct + trait) * roleFactor),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildLineageScores(
  tags: Record<string, number>,
  speciesCandidates: SpeciesCandidate[],
) {
  const [first, second] = speciesCandidates;
  const primaryLead =
    first && second && first.score > 0
      ? Math.max(0, (first.score - second.score) / first.score)
      : 0;

  return {
    pure: roundScore(
      (tags.pure_bias || 0) +
        (tags.clear_species_shape || 0) +
        (primaryLead >= lineageThresholds.clearPrimaryLeadRatio ? 1.2 : 0),
    ),
    hybrid: roundScore(
      (tags.hybrid_bias || 0) +
        (tags.mythic_bias || 0) * 0.8 +
        (tags.mechanical_bias || 0) +
        (tags.scale || 0) * 0.5 +
        (tags.feather || 0) * 0.5,
    ),
  };
}

function recommendLineage(scores: { pure: number; hybrid: number }) {
  if (scores.hybrid - scores.pure >= lineageThresholds.hybridAdvantage) return "hybrid";
  if (scores.pure - scores.hybrid >= lineageThresholds.pureAdvantage) return "pure";
  return scores.hybrid >= scores.pure ? "hybrid" : "pure";
}

function uniqueEffects(effects: ScoreSnapshot["selectedEffects"]) {
  return {
    missions: Array.from(new Set(effects.missions)),
    palettes: Array.from(new Set(effects.palettes)),
    roles: Array.from(new Set(effects.roles)),
    mustKeep: Array.from(new Set(effects.mustKeep)),
    avoid: Array.from(new Set(effects.avoid)),
    promptHints: Array.from(new Set(effects.promptHints)),
  };
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}
