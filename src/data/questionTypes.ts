import type { ScoreTag } from "./scoreTags";

export type QuestionBranch =
  | "quick"
  | "base"
  | "lineage"
  | "mammal"
  | "mythic"
  | "special"
  | "visual"
  | "world"
  | "constraints";

export type QuestionOption = {
  id: string;
  label: string;
  scores: Partial<Record<ScoreTag, number>>;
  effects?: {
    mission?: string;
    palette?: string;
    role?: string;
    outfitHints?: string[];
    itemHints?: string[];
    sceneHints?: string[];
    poseHints?: string[];
    motifHints?: string[];
    mustKeep?: string[];
    avoid?: string[];
    promptHints?: string[];
    branchBoost?: QuestionBranch[];
  };
};

export type Question = {
  id: string;
  branch: QuestionBranch;
  title: string;
  options: QuestionOption[];
};

export type Answer = {
  questionId: string;
  optionId: string;
  branch?: QuestionBranch;
};
