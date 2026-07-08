import { deepQuestionBank } from "@/data/deepQuestionBank";
import { quickQuestions } from "@/data/quickQuestions";
import { scoreTagDefinitions } from "@/data/scoreTags";
import { speciesByKey, speciesTraitWeights } from "@/data/species";
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

  it("keeps active species focused on humanoid-friendly animals", () => {
    expect(speciesByKey).toMatchObject({
      bear: "熊",
      tiger: "虎",
    });
    expect(speciesByKey).not.toHaveProperty("owl");
    expect(speciesByKey).not.toHaveProperty("raven");
    expect(speciesByKey).not.toHaveProperty("eagle");
    expect(speciesByKey).not.toHaveProperty("whale");

    const retiredSpecies = new Set(["owl", "raven", "eagle", "whale"]);
    for (const question of [...quickQuestions, ...deepQuestionBank]) {
      for (const option of question.options) {
        for (const tag of Object.keys(option.scores)) {
          expect(retiredSpecies.has(tag), `${question.id}.${option.id}.${tag}`).toBe(false);
        }
      }
    }
  });

  it("keeps quick question species scores reasonably balanced", () => {
    const speciesTags = new Set(
      Object.entries(scoreTagDefinitions)
        .filter(([, definition]) => definition.category === "species")
        .map(([tag]) => tag),
    );
    const totals = new Map<string, number>();

    for (const question of quickQuestions) {
      for (const option of question.options) {
        for (const [tag, score] of Object.entries(option.scores)) {
          if (!speciesTags.has(tag)) continue;
          totals.set(tag, (totals.get(tag) || 0) + score);
        }
      }
    }

    expect(totals.get("bear")).toBeGreaterThanOrEqual(2.5);
    expect(totals.get("tiger")).toBeGreaterThanOrEqual(2.5);
    expect(Math.max(...totals.values())).toBeLessThanOrEqual(5);
  });

  it("keeps quick question copy fixed while score tags evolve", () => {
    expect(quickQuestions.map((question) => ({
      title: question.title,
      options: question.options.map((option) => option.label),
    }))).toEqual([
      {
        title: "团队开始一个新计划时，你通常会先做什么？",
        options: [
          "先整理细节和可能被忽略的线索",
          "先确认每个人状态，再分配任务",
          "先建立看板、流程和反馈机制",
          "先提出一个跳出常规的切入点",
        ],
      },
      {
        title: "你更希望角色形成哪种做事习惯？",
        options: [
          "先定规则和判断标准",
          "保留直觉和仪式感",
          "轻装上阵，边做边调整",
          "用工具和数据提高效率",
        ],
      },
      {
        title: "当你的判断被质疑时，你更可能怎么回应？",
        options: [
          "先听完，不急着解释",
          "拿出依据，一起核对",
          "把问题摊开，直接沟通清楚",
          "换个角度，绕开无效争执",
        ],
      },
      {
        title: "面对四种计划风格，你更偏向哪一种？",
        options: [
          "稳住节奏，给大家留缓冲",
          "从长期关系和基础做起",
          "先搭一个可迭代原型",
          "用愿景和原则统领全局",
        ],
      },
      {
        title: "时间有限时，你更倾向选择哪种推进方式？",
        options: [
          "先拉开视角，确认全局再行动",
          "沿着最短路线快速通过",
          "列出计划，把风险提前标出来",
          "加入合作节奏，和大家一起推进",
        ],
      },
      {
        title: "收到一份复杂资料时，你会先看哪部分？",
        options: [
          "整体结构和来源",
          "最不协调的细节",
          "相关人和责任关系",
          "被忽略的附加条件",
        ],
      },
      {
        title: "角色遇到压力时，更常用哪种方式表达状态？",
        options: [
          "主动照顾气氛，让大家放松",
          "用清单和工具把事情推进",
          "保持克制，等关键时刻表态",
          "暂时后撤，给自己留安静空间",
        ],
      },
      {
        title: "你希望角色被别人记住，主要因为哪种行为？",
        options: [
          "做事稳定，标准清楚",
          "解决问题时总有独特办法",
          "能把复杂信息讲得容易理解",
          "关键时刻敢站出来",
        ],
      },
      {
        title: "有人请求你帮忙，但会拖慢你的任务。你会？",
        options: [
          "判断对方是否真的需要帮助，再决定",
          "嘴上嫌麻烦，还是伸手",
          "直接帮，但不留下名字",
          "让对方跟上，跟不上就算了",
        ],
      },
      {
        title: "团队意见突然分歧时，你会怎么处理？",
        options: [
          "先安静观察各方立场",
          "明确边界，再推进决定",
          "先确认共同目标",
          "换一种讨论方式打破僵局",
        ],
      },
      {
        title: "如果角色有一个长期目标，你更喜欢它是？",
        options: [
          "修复一套失灵的记录系统",
          "守护一个重要约定",
          "把一份希望送到更远处",
          "回收一件失控的工具",
        ],
      },
      {
        title: "最后遇到不可避免的冲突，你希望角色怎么行动？",
        options: [
          "先把局面讲清楚，再做决定",
          "保护核心目标，其余临场调整",
          "主动打破惯例，找到新解法",
          "借助工具或改造，把劣势转成优势",
        ],
      },
    ]);
  });

  it("broadens quick world, rational, and body scoring without changing questions", () => {
    const totals = totalQuickScoresByCategory();

    expect(totals.personality.get("academy")).toBeGreaterThanOrEqual(3.5);
    expect(totals.world.size).toBeGreaterThanOrEqual(8);
    expect(totals.world.get("cyber")).toBeLessThanOrEqual(5.2);
    expect(totals.body.get("strong")).toBeGreaterThanOrEqual(2.5);
    expect(totals.body.get("chubby")).toBeGreaterThanOrEqual(1.2);
    expect(totals.body.get("heavy")).toBeGreaterThanOrEqual(2);
    expect(totals.body.get("slim")).toBeLessThanOrEqual(4.4);
  });

  it("connects humanoid-friendly animals to relevant body shape tags", () => {
    expect(speciesTraitWeights.bear.strong).toBeGreaterThan(0);
    expect(speciesTraitWeights.bear.chubby).toBeGreaterThan(0);
    expect(speciesTraitWeights.tiger.strong).toBeGreaterThan(0);
    expect(speciesTraitWeights.tiger).not.toHaveProperty("chubby");
    expect(speciesTraitWeights.leopard.slim).toBeGreaterThan(0);
    expect(speciesTraitWeights.rabbit.small).toBeGreaterThan(0);
  });

  it("keeps same-category quick scores balanced by occurrence and random expectation", () => {
    const totals = totalQuickScoreStatsByCategory();

    expectCategoryBalance(totals.personality, {
      minCount: 5,
      minExpected: 0.8,
      maxExpected: 1.8,
    });
    expectCategoryBalance(totals.species, {
      minCount: 4,
      maxCount: 8,
      minExpected: 0.5,
      maxExpected: 1,
      maxExpectedRatio: 2,
    });
    expectCategoryBalance(totals.world, {
      minCount: 2,
      minExpected: 0.25,
      maxExpected: 1.1,
    });
    expectCategoryBalance(totals.body, {
      minCount: 2,
      minExpected: 0.2,
      maxExpected: 0.95,
    });
    expectCategoryBalance(totals.lineage, {
      minCount: 2,
      minExpected: 0.25,
      maxExpected: 1.3,
    });
    expectCategoryBalance(totals.trait, {
      minCount: 2,
      minExpected: 0.2,
      maxExpected: 0.45,
    });
    expect(totals.mood.size).toBeGreaterThanOrEqual(4);
    expectCategoryBalance(totals.mood, {
      minCount: 2,
      minExpected: 0.25,
      maxExpected: 0.8,
    });
  });
});

function totalQuickScoresByCategory() {
  const totals: Record<string, Map<string, number>> = {};

  for (const question of quickQuestions) {
    for (const option of question.options) {
      for (const [tag, score] of Object.entries(option.scores)) {
        const category = scoreTagDefinitions[tag as keyof typeof scoreTagDefinitions].category;
        totals[category] ??= new Map<string, number>();
        totals[category].set(tag, (totals[category].get(tag) || 0) + score);
      }
    }
  }

  return totals;
}

function totalQuickScoreStatsByCategory() {
  const totals: Record<string, Map<string, { count: number; total: number }>> = {};

  for (const question of quickQuestions) {
    for (const option of question.options) {
      for (const [tag, score] of Object.entries(option.scores)) {
        const category = scoreTagDefinitions[tag as keyof typeof scoreTagDefinitions].category;
        totals[category] ??= new Map<string, { count: number; total: number }>();
        const current = totals[category].get(tag) || { count: 0, total: 0 };
        totals[category].set(tag, {
          count: current.count + 1,
          total: current.total + score,
        });
      }
    }
  }

  return totals;
}

function expectCategoryBalance(
  stats: Map<string, { count: number; total: number }>,
  thresholds: {
    minCount: number;
    maxCount?: number;
    minExpected: number;
    maxExpected: number;
    maxExpectedRatio?: number;
  },
) {
  const expectedValues: number[] = [];
  for (const [tag, value] of stats) {
    const expected = value.total / 4;
    expectedValues.push(expected);
    expect(value.count, `${tag}.count`).toBeGreaterThanOrEqual(thresholds.minCount);
    if (thresholds.maxCount !== undefined) {
      expect(value.count, `${tag}.count`).toBeLessThanOrEqual(thresholds.maxCount);
    }
    expect(expected, `${tag}.expected`).toBeGreaterThanOrEqual(thresholds.minExpected);
    expect(expected, `${tag}.expected`).toBeLessThanOrEqual(thresholds.maxExpected);
  }
  if (thresholds.maxExpectedRatio !== undefined) {
    const minExpected = Math.min(...expectedValues);
    const maxExpected = Math.max(...expectedValues);
    expect(maxExpected / minExpected, "expected ratio").toBeLessThanOrEqual(thresholds.maxExpectedRatio);
  }
}
