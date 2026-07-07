import type { Answer } from "@/data/questionTypes";
import { scoreAnswers, type ScoreSnapshot } from "@/lib/scoring";

export type LineageMode = "ai" | "pure" | "hybrid";
export type InputMode = "quick" | "deep";

export type QuickAnswer = Answer;

export type DeepConfig = {
  primarySpeciesPreference?: string;
  secondarySpeciesPreference?: string;
  worldStyle?: string;
  role?: string;
  mission?: string;
  bodyType?: string;
  humanTraitLevel?: string;
  animalTraitLevel?: string;
  palette?: string;
  mustKeep?: string;
  avoid?: string;
};

export type GenerateRequest = {
  mode: InputMode;
  lineageMode: LineageMode;
  answers?: QuickAnswer[];
  deepConfig?: DeepConfig;
  scoreSnapshot?: ScoreSnapshot;
};

export type CharacterBlueprint = {
  lineageMode: "pure" | "hybrid";
  primarySpecies: string;
  secondarySpecies: string[];
  speciesRatio: Record<string, number>;
  worldStyle: string;
  role: string;
  mission: string;
  bodyType: string;
  height: string;
  personalityKeywords: string[];
  visualKeywords: string[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
    shadow: string;
  };
  mustKeep: string[];
  avoid: string[];
  traitMapping: string[];
};

export type CharacterSpec = {
  name: string;
  lineage_mode: "pure" | "hybrid";
  primary_species: string;
  secondary_species: string[];
  species_ratio: Record<string, number>;
  positioning: string;
  personality_keywords: string[];
  visual_keywords: string[];
  colors: CharacterBlueprint["colors"];
  body: string;
  height: string;
  features: {
    ears: string;
    tail: string;
    eyes: string;
    fur: string;
    special_marks: string;
  };
  outfit: string;
  signature_item: string;
  background_story: string;
  mission: string;
  catchphrase: string;
  must_keep: string[];
  avoid: string[];
  prompts: {
    complete_scene: string;
    reference_sheet: string;
    avatar: string;
  };
  setting_description: string;
};

const defaultColors = {
  primary: "#1E2A38",
  secondary: "#E65A2E",
  accent: "#22D3C5",
  neutral: "#E8E1D3",
  shadow: "#0B0F14",
};

export function inferCharacterBlueprint(request: GenerateRequest): CharacterBlueprint {
  const snapshot = getScoreSnapshot(request);
  const scores = snapshot.tags;
  const primarySpecies =
    request.deepConfig?.primarySpeciesPreference?.trim() ||
    snapshot.speciesCandidates[0]?.species ||
    "狐";
  const recommendedLineage = snapshot.lineageRecommendation;
  const lineageMode =
    request.lineageMode === "ai" ? recommendedLineage : request.lineageMode;
  const secondarySpecies =
    lineageMode === "hybrid"
      ? pickSecondarySpecies(request, primarySpecies, snapshot)
      : [];
  const speciesRatio =
    lineageMode === "pure"
      ? { [primarySpecies]: 100 }
      : buildHybridRatio(primarySpecies, secondarySpecies);
  const worldStyle = request.deepConfig?.worldStyle || inferWorldStyle(scores);
  const role = request.deepConfig?.role || snapshot.selectedEffects.roles[0] || inferRole(scores);
  const mission =
    request.deepConfig?.mission ||
    snapshot.selectedEffects.missions[0] ||
    inferMission(scores);
  const mustKeep = [
    ...splitList(request.deepConfig?.mustKeep),
    ...snapshot.selectedEffects.mustKeep,
  ];
  const avoid = [
    ...splitList(request.deepConfig?.avoid),
    ...snapshot.selectedEffects.avoid,
    ...(lineageMode === "pure"
      ? ["不要混入其他物种的显著特征"]
      : ["不要让副物种压过主物种"]),
  ];

  return {
    lineageMode,
    primarySpecies,
    secondarySpecies,
    speciesRatio,
    worldStyle,
    role,
    mission,
    bodyType: request.deepConfig?.bodyType || inferBodyType(scores),
    height: inferHeight(scores),
    personalityKeywords: inferPersonality(scores),
    visualKeywords: inferVisualKeywords(
      primarySpecies,
      secondarySpecies,
      worldStyle,
      snapshot,
    ),
    colors: defaultColors,
    mustKeep,
    avoid,
    traitMapping: buildTraitMapping(primarySpecies, secondarySpecies),
  };
}

export function buildFallbackCharacterSpec(
  blueprint: CharacterBlueprint,
): CharacterSpec {
  const name = "";
  const lineageLabel = blueprint.lineageMode === "pure" ? "纯血" : "混血";
  const secondaryLabel = blueprint.secondarySpecies.length
    ? `，融合${blueprint.secondarySpecies.join("、")}特征`
    : "";
  const positioning = `${blueprint.worldStyle}${blueprint.role}`;
  const promptTextRule = "no visible text, no character name, no labels, no typography, no watermark";
  const completeScene = [
    `${blueprint.primarySpecies}${lineageLabel}兽设角色${secondaryLabel}`,
    `${blueprint.worldStyle}世界观`,
    "character overview image based on the persona dataset and world background",
    "full body anthropomorphic character, cinematic fantasy mobile game key visual",
    "deep ink background, cyan and amber accents, refined East Asian fantasy cyber style",
    promptTextRule,
  ].join(", ");
  const referenceSheet = [
    `${blueprint.primarySpecies} character design reference sheet`,
    `${lineageLabel} lineage`,
    blueprint.traitMapping.join(", "),
    "front view, back view, visual detail panels, color palette blocks, clean layout",
    promptTextRule,
  ].join(", ");
  const settingDescription = [
    `${blueprint.primarySpecies}${lineageLabel}兽设，定位为${positioning}。`,
    `核心性格是${blueprint.personalityKeywords.join("、")}。`,
    `外观重点包括${blueprint.visualKeywords.join("、")}。`,
    `身高${blueprint.height}，整体适合${blueprint.worldStyle}氛围。`,
  ].join("");

  return {
    name,
    lineage_mode: blueprint.lineageMode,
    primary_species: blueprint.primarySpecies,
    secondary_species: blueprint.secondarySpecies,
    species_ratio: blueprint.speciesRatio,
    positioning,
    personality_keywords: blueprint.personalityKeywords,
    visual_keywords: blueprint.visualKeywords,
    colors: blueprint.colors,
    body: blueprint.bodyType,
    height: blueprint.height,
    features: {
      ears: `${blueprint.primarySpecies}系耳部轮廓，边缘带有冷青色细光`,
      tail: blueprint.lineageMode === "pure"
        ? `${blueprint.primarySpecies}特征尾巴，轮廓清晰`
        : `${blueprint.primarySpecies}主尾形，尾端带有副血统异化纹理`,
      eyes: "青绿色竖瞳，警觉但克制",
      fur: "深灰蓝底色，局部赤橙渐变",
      special_marks: "肩颈处有月牙形发光标记",
    },
    outfit: `${blueprint.worldStyle}轻装外套与功能性护具`,
    signature_item: "可折叠追踪刃",
    background_story: `来自边境地带的${blueprint.role}，习惯在危险环境中独立行动。`,
    mission: blueprint.mission,
    catchphrase: "别跟太近，我会分心。",
    must_keep: blueprint.mustKeep,
    avoid: blueprint.avoid,
    prompts: {
      complete_scene: completeScene,
      reference_sheet: referenceSheet,
      avatar: `${blueprint.primarySpecies} anthropomorphic avatar portrait, ${blueprint.worldStyle} style, ${promptTextRule}`,
    },
    setting_description: settingDescription,
  };
}

function getScoreSnapshot(request: GenerateRequest) {
  const snapshot = request.scoreSnapshot || scoreAnswers(request.answers || []);
  const scores = { ...snapshot.tags };

  const config = request.deepConfig;
  if (config?.worldStyle?.includes("赛博")) {
    scores.cyber = (scores.cyber || 0) + 1;
    scores.mechanical_bias = (scores.mechanical_bias || 0) + 0.8;
  }
  if (config?.worldStyle?.includes("神话")) {
    scores.mythic_bias = (scores.mythic_bias || 0) + 1;
  }
  if (config?.secondarySpeciesPreference) {
    scores.hybrid_bias = (scores.hybrid_bias || 0) + 1.5;
  }

  if (scores === snapshot.tags) return snapshot;

  return {
    ...snapshot,
    tags: scores,
  };
}

function pickSecondarySpecies(
  request: GenerateRequest,
  primarySpecies: string,
  snapshot: ScoreSnapshot,
) {
  const preferred = request.deepConfig?.secondarySpeciesPreference?.trim();
  if (preferred && preferred !== primarySpecies) {
    return request.deepConfig?.worldStyle?.includes("赛博")
      ? [preferred, "机械义体"]
      : [preferred];
  }

  const ranked = snapshot.speciesCandidates
    .map((candidate) => candidate.species)
    .filter((species) => species !== primarySpecies);

  const fallback = primarySpecies === "东方龙" ? ["狐"] : ["东方龙"];
  return [...ranked, ...fallback].slice(0, 2);
}

function buildHybridRatio(primarySpecies: string, secondarySpecies: string[]) {
  if (secondarySpecies.length > 1) {
    return {
      [primarySpecies]: 65,
      [secondarySpecies[0]]: 25,
      [secondarySpecies[1]]: 10,
    };
  }

  return {
    [primarySpecies]: 70,
    [secondarySpecies[0] || "幻想异化"]: 30,
  };
}

function buildTraitMapping(primarySpecies: string, secondarySpecies: string[]) {
  const mapping = [`${primarySpecies}：主体轮廓、耳朵、尾巴和基础毛色`];
  secondarySpecies.forEach((species, index) => {
    mapping.push(
      `${species}：${index === 0 ? "肩颈纹理、眼睛和尾端异化" : "装备、发光纹路和局部义体"}`,
    );
  });
  return mapping;
}

function inferWorldStyle(scores: Record<string, number>) {
  if ((scores.cyber || 0) + (scores.mechanical_bias || 0) > 2) return "赛博";
  if ((scores.dragon || 0) + (scores.qilin || 0) + (scores.mythic_bias || 0) > 3) return "神话";
  if ((scores.forest || 0) + (scores.deer || 0) > 2) return "森系";
  if ((scores.dark || 0) + (scores.raven || 0) > 2) return "暗黑";
  return "夜行幻想";
}

function inferRole(scores: Record<string, number>) {
  if ((scores.loyal || 0) > 2) return "守卫";
  if ((scores.mythic_bias || 0) > 2) return "术士";
  if ((scores.mechanical_bias || 0) > 2) return "机械斥候";
  return "斥候";
}

function inferMission(scores: Record<string, number>) {
  if ((scores.loyal || 0) > 2) return "守护失落据点";
  if ((scores.mythic_bias || 0) > 2) return "寻找古老契约";
  if ((scores.mechanical_bias || 0) > 2) return "追踪异常信号";
  return "追踪边境线索";
}

function inferBodyType(scores: Record<string, number>) {
  if ((scores.dragon || 0) > 3) return "高挑修长，带有压迫感";
  if ((scores.rabbit || 0) > 2) return "小型轻盈，动作敏捷";
  if ((scores.lion || 0) > 2) return "厚重结实，肩背有力量感";
  return "中等偏瘦，四肢修长";
}

function inferHeight(scores: Record<string, number>) {
  if ((scores.giant || 0) > 0.6 || (scores.heavy || 0) > 1) return "188cm";
  if ((scores.small || 0) > 0.7 || (scores.rabbit || 0) > 1) return "158cm";
  if ((scores.slim || 0) > 0.7 || (scores.deer || 0) > 1) return "176cm";
  return "172cm";
}

function inferPersonality(scores: Record<string, number>) {
  const keywords = ["警觉", "敏锐"];
  if ((scores.loyal || 0) > 1) keywords.push("护短");
  if ((scores.mystery || 0) > 1) keywords.push("神秘");
  if ((scores.wild || 0) > 1) keywords.push("野性");
  if ((scores.attachment || 0) > 1) keywords.push("慢热黏人");
  return Array.from(new Set(keywords)).slice(0, 5);
}

function inferVisualKeywords(
  primarySpecies: string,
  secondarySpecies: string[],
  worldStyle: string,
  snapshot?: ScoreSnapshot,
) {
  return [
    `${primarySpecies}耳`,
    `${primarySpecies}尾`,
    ...secondarySpecies.map((species) => `${species}局部特征`),
    `${worldStyle}服饰`,
    ...(snapshot?.selectedEffects.promptHints || []),
    "青绿色发光纹路",
  ].slice(0, 8);
}

function splitList(value?: string) {
  if (!value) return [];
  return value
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
