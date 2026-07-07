import { quickQuestions } from "@/data/quickQuestions";
import type { Answer } from "@/data/questionTypes";
import { scoreAnswers } from "@/lib/scoring";
import { describe, expect, it } from "vitest";
import {
  buildFallbackCharacterSpec,
  inferCharacterBlueprint,
  type GenerateRequest,
} from "./fursona";

describe("quickQuestions", () => {
  it("contains exactly 12 fixed quick questions", () => {
    expect(quickQuestions).toHaveLength(12);
    expect(new Set(quickQuestions.map((question) => question.id)).size).toBe(12);
  });

  it("keeps score data hidden behind selectable options", () => {
    for (const question of quickQuestions) {
      expect(question.options.length).toBeGreaterThanOrEqual(4);
      for (const option of question.options) {
        expect(option.label.length).toBeGreaterThan(0);
        expect(Object.keys(option.scores).length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("asks the final quick question as a personality or action choice", () => {
    const finalQuestion = quickQuestions.find(
      (question) => question.id === "q12_result_focus",
    );
    expect(finalQuestion).toBeDefined();

    const copy = [
      finalQuestion?.title,
      ...(finalQuestion?.options.map((option) => option.label) || []),
    ].join("\n");

    expect(copy).not.toMatch(/生成|结果|产品|功能|题目/);
    expect(copy).toMatch(/行动|选择|局面|目标|规则|工具/);
  });

  it("keeps quick questions focused on personality and choices instead of dark or appearance prompts", () => {
    const quickCopy = quickQuestions
      .map((question) =>
        JSON.stringify({
          title: question.title,
          options: question.options.map((option) => ({
            label: option.label,
            effects: option.effects,
          })),
        }),
      )
      .join("\n");

    expect(quickCopy).not.toMatch(
      /雨夜|旧车站|没有主人|危险区域|陌生人|非语言信号|身上出现|远处被认出来|身体剪影|局部特征|配色|深夜|敲击|被删除|不能打开|追捕|危险遗物|黑色|影子|污渍|划掉/,
    );
    expect(quickCopy).toMatch(/选择|决定|合作|目标|计划|沟通|行动/);
  });
});

describe("scoreAnswers", () => {
  it("ranks a cyber fox-dragon leaning answer set without one-answer lock-in", () => {
    const answers: Answer[] = [
      { questionId: "q01_station_focus", optionId: "drawer" },
      { questionId: "q02_token", optionId: "core" },
      { questionId: "q06_letter", optionId: "crossed_line" },
      { questionId: "q08_recognition", optionId: "odd_feature" },
      { questionId: "q11_mission", optionId: "memory" },
      { questionId: "q12_result_focus", optionId: "abnormal" },
    ];

    const snapshot = scoreAnswers(answers);

    expect(snapshot.speciesCandidates[0].species).toBe("狐");
    expect(snapshot.lineageRecommendation).toBe("hybrid");
    expect(snapshot.tags.hybrid_bias).toBeGreaterThan(2);
  });

  it("recommends pure lineage when clarity and pure bias dominate", () => {
    const answers: Answer[] = [
      { questionId: "q02_token", optionId: "badge" },
      { questionId: "q05_route", optionId: "old_map" },
      { questionId: "q08_recognition", optionId: "silhouette" },
      { questionId: "q12_result_focus", optionId: "clear" },
    ];

    const snapshot = scoreAnswers(answers);

    expect(snapshot.lineageRecommendation).toBe("pure");
    expect(snapshot.lineageScores.pure).toBeGreaterThan(snapshot.lineageScores.hybrid);
  });
});

describe("inferCharacterBlueprint", () => {
  it("keeps pure lineage to one species at 100 percent", () => {
    const request: GenerateRequest = {
      mode: "quick",
      lineageMode: "pure",
      answers: [
        { questionId: "q01_station_focus", optionId: "drawer" },
        { questionId: "q03_called_out", optionId: "pause" },
        { questionId: "q05_route", optionId: "high_ground" },
        { questionId: "q12_result_focus", optionId: "clear" },
      ],
    };

    const blueprint = inferCharacterBlueprint(request);

    expect(blueprint.lineageMode).toBe("pure");
    expect(blueprint.secondarySpecies).toEqual([]);
    expect(blueprint.speciesRatio).toEqual({ 狐: 100 });
    expect(blueprint.avoid).toContain("不要混入其他物种的显著特征");
  });

  it("creates a readable hybrid with a dominant primary species", () => {
    const request: GenerateRequest = {
      mode: "deep",
      lineageMode: "hybrid",
      deepConfig: {
        primarySpeciesPreference: "赤狐",
        secondarySpeciesPreference: "东方龙",
        worldStyle: "赛博",
        role: "斥候",
        mission: "追踪",
        bodyType: "高挑",
        humanTraitLevel: "中",
        animalTraitLevel: "高",
        palette: "深灰蓝 / 赤橙 / 荧光青",
        mustKeep: "狐耳、大尾巴、青绿色竖瞳",
        avoid: "不要画成猫科",
      },
    };

    const blueprint = inferCharacterBlueprint(request);

    expect(blueprint.lineageMode).toBe("hybrid");
    expect(blueprint.primarySpecies).toBe("赤狐");
    expect(blueprint.secondarySpecies).toContain("东方龙");
    expect(blueprint.speciesRatio["赤狐"]).toBeGreaterThanOrEqual(55);
    expect(blueprint.traitMapping.some((item) => item.includes("东方龙"))).toBe(true);
  });

  it("lets AI recommended mode choose hybrid for high fantasy cyber inputs", () => {
    const request: GenerateRequest = {
      mode: "quick",
      lineageMode: "ai",
      answers: [
        { questionId: "q02_token", optionId: "core" },
        { questionId: "q04_painting", optionId: "cloud_temple" },
        { questionId: "q07_signal", optionId: "under_marks" },
        { questionId: "q12_result_focus", optionId: "modified" },
      ],
    };

    const blueprint = inferCharacterBlueprint(request);

    expect(blueprint.lineageMode).toBe("hybrid");
    expect(Object.keys(blueprint.speciesRatio).length).toBeGreaterThan(1);
  });
});

describe("buildFallbackCharacterSpec", () => {
  it("renders setting content from the same inferred blueprint", () => {
    const blueprint = inferCharacterBlueprint({
      mode: "quick",
      lineageMode: "pure",
      answers: [{ questionId: "q09_help", optionId: "complain_help" }],
    });

    const spec = buildFallbackCharacterSpec(blueprint);

    expect(spec.primary_species).toBe(blueprint.primarySpecies);
    expect(spec.lineage_mode).toBe("pure");
    expect(spec.height).toMatch(/cm$/);
    expect(spec.setting_description).toContain(spec.primary_species);
    expect(spec.prompts.complete_scene).toContain(spec.primary_species);
    expect(spec.prompts.complete_scene).toContain("no visible text");
    expect(spec.prompts.complete_scene).toContain("no character name");
    expect(spec.prompts.reference_sheet).toContain(spec.primary_species);
  });
});
