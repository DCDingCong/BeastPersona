import type { Answer, Question } from "@/data/questionTypes";

export function upsertAnswer(
  answers: Answer[],
  question: Question,
  optionId: string,
): Answer[] {
  return [
    ...answers.filter((answer) => answer.questionId !== question.id),
    { questionId: question.id, optionId, branch: question.branch },
  ];
}

export function getSelectedOptionId(
  answers: Answer[],
  questionId?: string,
): string | null {
  if (!questionId) return null;
  return answers.find((answer) => answer.questionId === questionId)?.optionId || null;
}

export function getPreviousQuickQuestionIndex(questionIndex: number) {
  return questionIndex > 0 ? questionIndex - 1 : null;
}

export function pushDeepQuestion(
  questionStack: string[],
  questionId: string,
): string[] {
  if (questionStack[questionStack.length - 1] === questionId) {
    return questionStack;
  }

  return [...questionStack, questionId];
}

export function getPreviousDeepQuestionId(questionStack: string[]) {
  return questionStack[questionStack.length - 1] || null;
}

export function popPreviousDeepQuestion(questionStack: string[]) {
  return {
    previousQuestionId: getPreviousDeepQuestionId(questionStack),
    nextStack: questionStack.slice(0, -1),
  };
}
