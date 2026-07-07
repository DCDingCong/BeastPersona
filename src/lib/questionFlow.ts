import { deepQuestionBank } from "@/data/deepQuestionBank";
import type { Answer, Question, QuestionBranch } from "@/data/questionTypes";
import { scoreAnswers } from "@/lib/scoring";

export type DeepFlowDepth = "light" | "standard" | "professional";

const depthLimits: Record<DeepFlowDepth, number> = {
  light: 20,
  standard: 28,
  professional: 36,
};

const branchTargets: Record<DeepFlowDepth, Partial<Record<QuestionBranch, number>>> = {
  light: { base: 8, lineage: 3, mammal: 3, mythic: 3, special: 3, visual: 3, world: 2, constraints: 1 },
  standard: { base: 8, lineage: 4, mammal: 5, mythic: 5, special: 5, visual: 5, world: 3, constraints: 2 },
  professional: { base: 8, lineage: 5, mammal: 6, mythic: 5, special: 5, visual: 6, world: 4, constraints: 4 },
};

export function selectDeepQuestions(
  answers: Answer[],
  depth: DeepFlowDepth = "standard",
): Question[] {
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  const baseQuestions = takeForBranch("base", branchTargets[depth].base || 8, answers, answeredIds);

  if (answers.length < 8) {
    return baseQuestions;
  }

  const snapshot = scoreAnswers(answers);
  const branches = selectBranches(snapshot.tags);
  const selected = [
    ...takeForBranch("base", branchTargets[depth].base || 8, answers, answeredIds),
    ...takeForBranch("lineage", branchTargets[depth].lineage || 4, answers, answeredIds),
  ];

  for (const branch of branches) {
    selected.push(...takeForBranch(branch, branchTargets[depth][branch] || 0, answers, answeredIds));
  }

  selected.push(...takeForBranch("visual", branchTargets[depth].visual || 5, answers, answeredIds));
  selected.push(...takeForBranch("world", branchTargets[depth].world || 3, answers, answeredIds));
  selected.push(...takeForBranch("constraints", branchTargets[depth].constraints || 2, answers, answeredIds));

  return dedupeQuestions(selected).slice(0, depthLimits[depth]);
}

function selectBranches(tags: Record<string, number>): QuestionBranch[] {
  const mammalScore = Math.max(
    tags.fox || 0,
    tags.wolf || 0,
    tags.dog || 0,
    tags.cat || 0,
    tags.deer || 0,
    tags.rabbit || 0,
    tags.snow_leopard || 0,
    tags.lion || 0,
  );
  const mythicScore =
    (tags.scale || 0) + (tags.mythic_bias || 0) + (tags.dragon || 0) + (tags.qilin || 0);
  const specialScore = (tags.feather || 0) + (tags.ocean || 0) + (tags.mechanical_bias || 0);

  return [
    { branch: "mammal" as const, score: mammalScore },
    { branch: "mythic" as const, score: mythicScore },
    { branch: "special" as const, score: specialScore },
  ]
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, 2)
    .map((item) => item.branch);
}

function takeUnanswered(branch: QuestionBranch, count: number, answeredIds: Set<string>) {
  return deepQuestionBank
    .filter((question) => question.branch === branch && !answeredIds.has(question.id))
    .slice(0, count);
}

function takeForBranch(
  branch: QuestionBranch,
  target: number,
  answers: Answer[],
  answeredIds: Set<string>,
) {
  const answeredInBranch = answers.filter((answer) => answer.branch === branch).length;
  return takeUnanswered(branch, Math.max(0, target - answeredInBranch), answeredIds);
}

function dedupeQuestions(questions: Question[]) {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}
