import { quickQuestions } from "@/data/quickQuestions";
import type { Answer } from "@/data/questionTypes";
import { scoreAnswers } from "@/lib/scoring";
import { describe, expect, it } from "vitest";
import {
  buildCharacterGenerationPreview,
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

  it("does not treat general structure and boundary answers as dragon-specific", () => {
    const answers: Answer[] = [
      { questionId: "q01_station_focus", optionId: "camera" },
      { questionId: "q02_token", optionId: "badge" },
      { questionId: "q03_called_out", optionId: "proof" },
      { questionId: "q04_painting", optionId: "cloud_temple" },
      { questionId: "q05_route", optionId: "old_map" },
      { questionId: "q06_letter", optionId: "seal" },
      { questionId: "q07_signal", optionId: "under_marks" },
      { questionId: "q08_recognition", optionId: "silhouette" },
      { questionId: "q09_help", optionId: "assess" },
      { questionId: "q10_knock", optionId: "behind_door" },
      { questionId: "q11_mission", optionId: "gate" },
      { questionId: "q12_result_focus", optionId: "clear" },
    ];

    const snapshot = scoreAnswers(answers);

    expect(snapshot.speciesCandidates[0].species).toBe("熊");
    expect(snapshot.speciesCandidates[1].species).toBe("麒麟");
  });

  it("defaults to pure lineage when there is no scoring evidence", () => {
    const snapshot = scoreAnswers([]);

    expect(snapshot.lineageRecommendation).toBe("pure");
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

  it("does not fill forced hybrid secondary species from zero-score candidates", () => {
    const blueprint = inferCharacterBlueprint({
      mode: "quick",
      lineageMode: "hybrid",
      answers: [],
    });

    expect(blueprint.secondarySpecies).toEqual([]);
    expect(blueprint.speciesRatio).toEqual({ 狐: 70, 幻想异化: 30 });
  });

  it("uses movement and mass tags when inferring body type", () => {
    const agileBlueprint = inferCharacterBlueprint({
      mode: "quick",
      lineageMode: "ai",
      answers: [
        { questionId: "q02_token", optionId: "blade" },
        { questionId: "q05_route", optionId: "shortest" },
        { questionId: "q10_knock", optionId: "side_exit" },
      ],
    });
    const heavyBlueprint = inferCharacterBlueprint({
      mode: "deep",
      lineageMode: "ai",
      answers: [
        { questionId: "db01_intro_shot", optionId: "break_in" },
        { questionId: "db06_action_style", optionId: "pressure" },
        { questionId: "db07_danger_source", optionId: "body_pressure" },
      ],
    });

    expect(agileBlueprint.bodyType).toBe("轻盈修长，适合快速行动");
    expect(heavyBlueprint.bodyType).toBe("厚重结实，肩背有力量感");
  });

  it("derives body type from animal-linked body tags", () => {
    const bearBlueprint = inferCharacterBlueprint({
      mode: "quick",
      lineageMode: "ai",
      scoreSnapshot: {
        tags: { bear: 3, strong: 2, chubby: 1.4, loyal: 1 },
        speciesCandidates: [{ key: "bear", species: "熊", score: 6 }],
        lineageScores: { pure: 1, hybrid: 0 },
        lineageRecommendation: "pure",
        selectedEffects: {
          missions: [],
          palettes: [],
          roles: [],
          mustKeep: [],
          avoid: [],
          promptHints: [],
        },
      },
    });
    const tigerBlueprint = inferCharacterBlueprint({
      mode: "quick",
      lineageMode: "ai",
      scoreSnapshot: {
        tags: { tiger: 3, strong: 2.2, wild: 1, dark: 0.5 },
        speciesCandidates: [{ key: "tiger", species: "虎", score: 5 }],
        lineageScores: { pure: 1, hybrid: 0 },
        lineageRecommendation: "pure",
        selectedEffects: {
          missions: [],
          palettes: [],
          roles: [],
          mustKeep: [],
          avoid: [],
          promptHints: [],
        },
      },
    });

    expect(bearBlueprint.bodyType).toBe("壮实偏圆，肩背厚，有稳定重量感");
    expect(tigerBlueprint.bodyType).toBe("精悍强壮，肩臂有爆发力");
  });

  it("keeps primary species body as the main body frame", () => {
    const blueprint = inferCharacterBlueprint({
      mode: "quick",
      lineageMode: "ai",
      scoreSnapshot: {
        tags: {
          bear: 2.2,
          strong: 1.6,
          chubby: 0.6,
          heavy: 0.4,
          control: 4,
          academy: 3.3,
          pure_bias: 2.2,
        },
        speciesCandidates: [
          { key: "bear", species: "熊", score: 9.61 },
          { key: "mech", species: "机械义体", score: 4.71 },
        ],
        lineageScores: { pure: 1, hybrid: 0 },
        lineageRecommendation: "pure",
        selectedEffects: {
          missions: [],
          palettes: [],
          roles: [],
          mustKeep: [],
          avoid: [],
          promptHints: [],
        },
      },
    });

    expect(blueprint.primarySpecies).toBe("熊");
    expect(blueprint.bodyType).toBe("壮实偏圆，肩背厚，有稳定重量感");
    expect(blueprint.height).toBe("188cm");
  });

  it("uses answer body scores as a minority detail when they conflict with species body", () => {
    const blueprint = inferCharacterBlueprint({
      mode: "quick",
      lineageMode: "ai",
      scoreSnapshot: {
        tags: {
          bear: 2.2,
          slim: 2,
          control: 2,
          academy: 1.6,
        },
        speciesCandidates: [
          { key: "bear", species: "熊", score: 8 },
          { key: "leopard", species: "豹", score: 5 },
        ],
        lineageScores: { pure: 1, hybrid: 0 },
        lineageRecommendation: "pure",
        selectedEffects: {
          missions: [],
          palettes: [],
          roles: [],
          mustKeep: [],
          avoid: [],
          promptHints: [],
        },
      },
    });

    expect(blueprint.primarySpecies).toBe("熊");
    expect(blueprint.bodyType).toContain("壮实偏圆为主");
    expect(blueprint.bodyType).toContain("轻盈修长");
    expect(blueprint.bodyType).toContain("70%");
    expect(blueprint.bodyType).toContain("30%");
  });
});

describe("buildCharacterGenerationPreview", () => {
  it("prepares Chinese tag groups and concrete prompts for the confirmation screen", () => {
    const preview = buildCharacterGenerationPreview({
      mode: "quick",
      lineageMode: "ai",
      answers: [
        { questionId: "q01_station_focus", optionId: "camera" },
        { questionId: "q02_token", optionId: "badge" },
        { questionId: "q04_painting", optionId: "mist_root" },
        { questionId: "q12_result_focus", optionId: "clear" },
      ],
    });

    expect(preview.tagGroups.map((group) => group.categoryLabel)).toContain("物种倾向");
    expect(preview.tagGroups.map((group) => group.categoryLabel)).toContain("体型倾向");
    expect(preview.tagGroups.flatMap((group) => group.tags).some((tag) => tag.label === "熊")).toBe(true);
    expect(preview.characterSpec.prompts.complete_scene).toContain("no visible text");
    expect(preview.characterSpec.prompts.reference_sheet).toContain(preview.characterSpec.primary_species);
    expect(preview.characterSpec.prompts.reference_sheet).toContain("竖版 A4 人物设定图");
    expect(preview.characterSpec.prompts.reference_sheet).toContain("九宫格头像表情");
    expect(preview.characterSpec.prompts.reference_sheet).toContain("必须全部使用简体中文");
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
    expect(spec.prompts.reference_sheet).toContain("服装变化");
    expect(spec.prompts.reference_sheet).toContain("中文色板");
    expect(spec.prompts.reference_sheet).toContain("角色背景、身份、生活区域、世界观与经历");
    expect(spec.prompts.reference_sheet).toContain("禁止出现英文");
  });
});
