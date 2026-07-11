import type { Answer } from "@/data/questionTypes";
import { scoreTagDefinitions, type ScoreTag } from "@/data/scoreTags";
import { scoreAnswers, type ScoreSnapshot } from "@/lib/scoring";
import type { OpenAIRequestSettings } from "@/lib/openaiSettings";

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
  confirmedSpec?: CharacterSpec;
  aiSettings?: OpenAIRequestSettings;
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
  paletteHint: string;
  outfitHints: string[];
  itemHints: string[];
  sceneHints: string[];
  poseHints: string[];
  motifHints: string[];
};

export type CharacterScene = {
  location: string;
  action: string;
  composition: string;
  camera: string;
  lighting: string;
};

export type CharacterSpec = {
  name: string;
  gender: "male";
  lineage_mode: "pure" | "hybrid";
  primary_species: string;
  secondary_species: string[];
  species_ratio: Record<string, number>;
  world_style: string;
  role: string;
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
  scene: CharacterScene;
  must_keep: string[];
  avoid: string[];
  prompts: {
    complete_scene: string;
    reference_sheet: string;
    avatar: string;
  };
  setting_description: string;
};

export type GenerationPreviewTag = {
  key: string;
  label: string;
  score: number;
};

export type GenerationPreviewTagGroup = {
  category: string;
  categoryLabel: string;
  tags: GenerationPreviewTag[];
};

export type CharacterGenerationPreview = {
  characterSpec: CharacterSpec;
  scoreSnapshot: ScoreSnapshot;
  tagGroups: GenerationPreviewTagGroup[];
};

type BodyFrame = {
  key: string;
  label: string;
  description: string;
  height: string;
};

const noVisibleTextRule =
  "no visible text, no character name, no labels, no typography, no watermark";

const referenceSheetLayoutRule = [
  "竖版 A4 人物设定图，白色与浅灰色的整洁画板",
  "专业兽设委托参考板风格",
  "以大型全身正面图和背面图为主体，解剖结构与服装保持一致",
  "左侧人物资料与中文介绍栏，右侧九宫格头像表情",
  "眼睛、耳朵、毛发纹理、尾巴、爪部、饰品与特殊标记的细节特写",
  "居家、日常、工作、外出的服装变化",
  "配饰与工具、中文色板、个人空间场景",
  "底部包含正面、侧面、背面的三视图",
  "使用纤细分隔线和清晰的漫画概念设计层级",
  "可增加由系统生成的角色背景、身份、生活区域、世界观与经历等设定信息",
].join("，");

export function withChineseReferenceSheetRules(prompt: string) {
  const languageRule = [
    "画面内所有可见标题、标签、注释、介绍和色板名称必须全部使用简体中文",
    "禁止出现英文、日文、韩文、拼音、拉丁字母及其他非中文介绍",
    "不显示角色姓名、签名和水印",
  ].join("，");
  const normalizedPrompt = prompt.trim();
  const withLayout = normalizedPrompt.includes("竖版 A4 人物设定图")
    ? normalizedPrompt
    : `${normalizedPrompt}，${referenceSheetLayoutRule}`;

  return withLayout.includes("画面内所有可见标题、标签、注释、介绍和色板名称必须全部使用简体中文")
    ? withLayout
    : `${withLayout}，${languageRule}`;
}

const categoryLabels: Record<string, string> = {
  personality: "性格倾向",
  species: "物种倾向",
  world: "世界观倾向",
  body: "体型倾向",
  lineage: "血统倾向",
  trait: "外观特征",
  visual: "视觉输出",
  mood: "情绪氛围",
  output: "输出偏好",
  constraint: "约束规则",
};

const categoryOrder = [
  "species",
  "lineage",
  "personality",
  "body",
  "world",
  "mood",
  "trait",
  "visual",
  "output",
  "constraint",
];

const speciesBodyFrames: Record<string, BodyFrame> = {
  熊: {
    key: "round_strong",
    label: "壮实偏圆",
    description: "壮实偏圆，肩背厚，有稳定重量感",
    height: "188cm",
  },
  虎: {
    key: "lean_strong",
    label: "精悍强壮",
    description: "精悍强壮，肩臂有爆发力",
    height: "188cm",
  },
  狮: {
    key: "heavy_strong",
    label: "厚重结实",
    description: "厚重结实，肩背有力量感",
    height: "188cm",
  },
  狼: {
    key: "lean_strong",
    label: "精悍强壮",
    description: "精悍强壮，四肢有耐力和爆发力",
    height: "180cm",
  },
  犬: {
    key: "medium_fit",
    label: "中等结实",
    description: "中等结实，动作稳定亲和",
    height: "174cm",
  },
  狐: {
    key: "slim",
    label: "轻盈修长",
    description: "轻盈修长，动作灵活",
    height: "176cm",
  },
  豹: {
    key: "slim",
    label: "轻盈修长",
    description: "轻盈修长，适合快速行动",
    height: "176cm",
  },
  雪豹: {
    key: "slim",
    label: "轻盈修长",
    description: "轻盈修长，带有厚实毛量",
    height: "176cm",
  },
  鹿: {
    key: "slim",
    label: "轻盈修长",
    description: "轻盈修长，站姿舒展",
    height: "176cm",
  },
  猫: {
    key: "small_slim",
    label: "小型轻盈",
    description: "小型轻盈，动作敏捷",
    height: "165cm",
  },
  兔: {
    key: "small_slim",
    label: "小型轻盈",
    description: "小型轻盈，动作敏捷",
    height: "158cm",
  },
  水獭: {
    key: "medium_soft",
    label: "中等柔和",
    description: "中等柔和，轮廓圆润灵活",
    height: "168cm",
  },
  东方龙: {
    key: "tall_slim",
    label: "高挑修长",
    description: "高挑修长，带有压迫感",
    height: "188cm",
  },
  蛇: {
    key: "tall_slim",
    label: "高挑修长",
    description: "高挑修长，线条流畅",
    height: "180cm",
  },
  麒麟: {
    key: "tall_slim",
    label: "高挑修长",
    description: "高挑修长，姿态端正",
    height: "182cm",
  },
  机械义体: {
    key: "medium_fit",
    label: "中等结实",
    description: "中等结实，带有机械结构感",
    height: "176cm",
  },
};

export function buildCharacterGenerationPreview(
  request: GenerateRequest,
): CharacterGenerationPreview {
  const scoreSnapshot = request.scoreSnapshot || scoreAnswers(request.answers || []);
  const blueprint = inferCharacterBlueprint({
    ...request,
    scoreSnapshot,
  });

  return {
    characterSpec: buildFallbackCharacterSpec(blueprint),
    scoreSnapshot,
    tagGroups: buildPreviewTagGroups(scoreSnapshot),
  };
}

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
    bodyType: request.deepConfig?.bodyType || inferBodyType(scores, primarySpecies),
    height: inferHeight(scores, primarySpecies),
    personalityKeywords: inferPersonality(scores),
    visualKeywords: inferVisualKeywords(
      primarySpecies,
      secondarySpecies,
      worldStyle,
      snapshot,
    ),
    colors: inferColors(scores, snapshot.selectedEffects.palettes[0]),
    mustKeep,
    avoid,
    traitMapping: buildTraitMapping(primarySpecies, secondarySpecies),
    paletteHint: snapshot.selectedEffects.palettes[0] || inferPaletteHint(scores),
    outfitHints: snapshot.selectedEffects.outfitHints,
    itemHints: snapshot.selectedEffects.itemHints,
    sceneHints: snapshot.selectedEffects.sceneHints,
    poseHints: snapshot.selectedEffects.poseHints,
    motifHints: snapshot.selectedEffects.motifHints,
  };
}

export function buildFallbackCharacterSpec(
  blueprint: CharacterBlueprint,
): CharacterSpec {
  const name = "";
  const lineageLabel = blueprint.lineageMode === "pure" ? "纯血" : "混血";
  const positioning = `${blueprint.worldStyle} · ${blueprint.role}`;
  const scene = inferScene(blueprint);
  const features = inferFeatures(blueprint);
  const outfit = inferOutfit(blueprint);
  const signatureItem = inferSignatureItem(blueprint);
  const settingDescription = [
    `${blueprint.primarySpecies}${lineageLabel}男性兽设，定位为${positioning}。`,
    `核心性格是${blueprint.personalityKeywords.join("、")}。`,
    `主要体型是${blueprint.bodyType}。`,
    `外观重点包括${blueprint.visualKeywords.join("、")}，配色方向为${blueprint.paletteHint}。`,
    `身高${blueprint.height}，常在${scene.location}${scene.action}。`,
  ].join("");

  const spec: CharacterSpec = {
    name,
    gender: "male",
    lineage_mode: blueprint.lineageMode,
    primary_species: blueprint.primarySpecies,
    secondary_species: blueprint.secondarySpecies,
    species_ratio: blueprint.speciesRatio,
    world_style: blueprint.worldStyle,
    role: blueprint.role,
    positioning,
    personality_keywords: blueprint.personalityKeywords,
    visual_keywords: blueprint.visualKeywords,
    colors: blueprint.colors,
    body: blueprint.bodyType,
    height: blueprint.height,
    features,
    outfit,
    signature_item: signatureItem,
    background_story: `在${scene.location}活动的${blueprint.role}，因${blueprint.mission}而持续行动。`,
    mission: blueprint.mission,
    catchphrase: inferCatchphrase(blueprint.personalityKeywords),
    scene,
    must_keep: blueprint.mustKeep,
    avoid: blueprint.avoid,
    prompts: { complete_scene: "", reference_sheet: "", avatar: "" },
    setting_description: settingDescription,
  };

  return { ...spec, prompts: buildImagePrompts(spec) };
}

export function buildImagePrompts(spec: CharacterSpec): CharacterSpec["prompts"] {
  const lineageLabel = spec.lineage_mode === "pure" ? "纯血" : `混血（${formatSpeciesRatio(spec.species_ratio)}）`;
  const colors = Object.entries(spec.colors).map(([key, value]) => `${key} ${value}`).join("、");
  const completeScene = [
    `${spec.primary_species}${lineageLabel}拟人角色`,
    "性别：男性，male character, masculine anatomy and presentation",
    `世界观：${spec.world_style}`,
    `身份：${spec.role}`,
    `性格：${spec.personality_keywords.join("、")}`,
    `体型与身高：${spec.body}，${spec.height}`,
    `配色：${colors}`,
    `耳朵：${spec.features.ears}`,
    `尾巴：${spec.features.tail}`,
    `眼睛：${spec.features.eyes}`,
    `毛色与纹理：${spec.features.fur}`,
    `特殊标记：${spec.features.special_marks}`,
    `服装：${spec.outfit}`,
    `标志物：${spec.signature_item}`,
    `地点：${spec.scene.location}`,
    `动作：${spec.scene.action}`,
    `构图：${spec.scene.composition}`,
    `镜头：${spec.scene.camera}`,
    `光照：${spec.scene.lighting}`,
    `完整全身可见，专业角色概念设计，保持物种解剖、服装、配饰和标记一致`,
    ...spec.must_keep.map((item) => `必须保留：${item}`),
    ...spec.avoid.map((item) => `禁止：${item}`),
    noVisibleTextRule,
  ].join("，");
  const referenceSheet = withChineseReferenceSheetRules([
    `${spec.primary_species}${lineageLabel}兽设人物设定图`,
    "性别：男性，角色必须明确呈现为男性",
    `世界观：${spec.world_style}`,
    `身份：${spec.role}`,
    `人物任务：${spec.mission}`,
    `体型与身高：${spec.body}，${spec.height}`,
    `性格关键词：${spec.personality_keywords.join("、")}`,
    `视觉关键词：${spec.visual_keywords.join("、")}`,
    `配色：${colors}`,
    `特征：${Object.values(spec.features).join("、")}`,
    `服装与标志物：${spec.outfit}，${spec.signature_item}`,
    `角色场景：${Object.values(spec.scene).join("、")}`,
  ].join("，"));
  const avatar = [
    `${spec.primary_species}${lineageLabel}拟人角色头像`,
    "性别：男性，male character, masculine facial structure and presentation",
    `身份：${spec.role}`,
    `性格：${spec.personality_keywords.join("、")}`,
    `配色：${colors}`,
    `眼睛：${spec.features.eyes}`,
    `毛色：${spec.features.fur}`,
    `特殊标记：${spec.features.special_marks}`,
    "头肩构图，清晰面部与耳部特征",
    noVisibleTextRule,
  ].join("，");

  return { complete_scene: completeScene, reference_sheet: referenceSheet, avatar };
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
    .filter((candidate) => candidate.score > 0)
    .map((candidate) => candidate.species)
    .filter((species) => species !== primarySpecies);

  return ranked.slice(0, 2);
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
  return pickHighest({
    赛博: (scores.cyber || 0) + (scores.mechanical_bias || 0) * 0.75,
    神话: (scores.mythic_bias || 0) + (scores.ritual || 0) * 0.8 + (scores.chinese || 0) * 0.5,
    森系: (scores.forest || 0) + (scores.soft || 0) * 0.35,
    遗迹: (scores.ruins || 0) + (scores.mystery || 0) * 0.55 + (scores.academy || 0) * 0.2,
    边境: (scores.frontier || 0) + (scores.wasteland || 0) * 0.8 + (scores.wild || 0) * 0.35,
    都市: (scores.urban || 0) + (scores.social || 0) * 0.35 + (scores.control || 0) * 0.2,
    暗黑: (scores.dark || 0) + (scores.tense || 0) * 0.6,
    海洋: (scores.ocean || 0) + (scores.calm || 0) * 0.35,
    夜行幻想: (scores.mystery || 0) * 0.35 + (scores.alone || 0) * 0.25 + 0.45,
  });
}

function inferRole(scores: Record<string, number>) {
  return pickHighest({
    守卫: (scores.loyal || 0) * 1.1 + (scores.control || 0) * 0.25,
    调查员: (scores.mystery || 0) * 0.8 + (scores.academy || 0) * 0.35,
    记录者: (scores.academy || 0) * 0.65 + (scores.ruins || 0) * 0.85,
    信使: (scores.social || 0) * 0.7 + (scores.ocean || 0) + (scores.warm || 0) * 0.5,
    工匠: (scores.mechanical_bias || 0) + (scores.cyber || 0) * 0.6,
    旅者: (scores.frontier || 0) * 1.1 + (scores.alone || 0) * 0.65,
    猎手: (scores.wild || 0) + (scores.dark || 0) * 0.45,
    术士: (scores.mythic_bias || 0) + (scores.ritual || 0) * 0.7,
    策士: (scores.control || 0) * 0.65 + (scores.academy || 0) * 0.35,
    医者: (scores.soft || 0) + (scores.loyal || 0) * 0.45 + (scores.warm || 0) * 0.4,
    逃亡者: (scores.chaos || 0) + (scores.dark || 0) * 0.4 + (scores.alone || 0) * 0.35,
    斥候: (scores.slim || 0) * 0.55 + (scores.frontier || 0) * 0.55 + (scores.mystery || 0) * 0.25,
  });
}

function inferMission(scores: Record<string, number>) {
  if ((scores.loyal || 0) > 2) return "守护失落据点";
  if ((scores.mythic_bias || 0) > 2) return "寻找古老契约";
  if ((scores.mechanical_bias || 0) > 2) return "追踪异常信号";
  return "追踪边境线索";
}

function inferBodyType(scores: Record<string, number>, primarySpecies: string) {
  const speciesFrame = speciesBodyFrames[primarySpecies];
  const answerFrame = inferAnswerBodyFrame(scores);

  if (!speciesFrame) {
    return answerFrame?.description || "中等偏瘦，四肢修长";
  }

  if (!answerFrame || answerFrame.key === speciesFrame.key) {
    return speciesFrame.description;
  }

  return `${speciesFrame.label}为主，${answerFrame.label}作为细节（约70%种族体型 / 30%答案体型）`;
}

function inferAnswerBodyFrame(scores: Record<string, number>): BodyFrame | undefined {
  if ((scores.bear || 0) > 1.5 && (scores.chubby || 0) > 0.8) {
    return speciesBodyFrames.熊;
  }
  if ((scores.tiger || 0) > 1.5 && (scores.strong || 0) > 1) {
    return speciesBodyFrames.虎;
  }
  if ((scores.strong || 0) > 1.8) {
    return {
      key: "lean_strong",
      label: "强壮结实",
      description: "强壮结实，动作有力量感",
      height: "188cm",
    };
  }
  if ((scores.giant || 0) > 0.6 || (scores.heavy || 0) > 1 || (scores.lion || 0) > 2) {
    return speciesBodyFrames.狮;
  }
  if ((scores.small || 0) > 0.7 || (scores.rabbit || 0) > 1) {
    return speciesBodyFrames.兔;
  }
  if ((scores.slim || 0) > 1.5 || (scores.deer || 0) > 1) {
    return speciesBodyFrames.豹;
  }
  if ((scores.dragon || 0) > 3) return speciesBodyFrames.东方龙;
  return undefined;
}

function inferHeight(scores: Record<string, number>, primarySpecies: string) {
  const speciesFrame = speciesBodyFrames[primarySpecies];
  if (speciesFrame) return speciesFrame.height;

  if ((scores.giant || 0) > 0.6 || (scores.heavy || 0) > 1 || (scores.strong || 0) > 1.8) return "188cm";
  if ((scores.small || 0) > 0.7 || (scores.rabbit || 0) > 1) return "158cm";
  if ((scores.slim || 0) > 0.7 || (scores.deer || 0) > 1) return "176cm";
  return "172cm";
}

function inferPersonality(scores: Record<string, number>) {
  const labels: Record<string, string> = {
    control: "有条理", academy: "理性", mystery: "善于观察", alone: "独立",
    loyal: "重视承诺", social: "善于协作", soft: "温和", warm: "体贴",
    chaos: "灵活破局", wild: "果断", calm: "沉稳", attachment: "慢热亲近",
  };
  const ranked = Object.entries(labels)
    .map(([key, label]) => ({ label, score: scores[key] || 0 }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "zh-CN"));
  return ranked.slice(0, 4).map((item) => item.label);
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
    ...(snapshot?.selectedEffects.motifHints || []),
  ].slice(0, 8);
}

function inferPaletteHint(scores: Record<string, number>) {
  return pickHighest({
    "冷白银灰与冰蓝": (scores.control || 0) + (scores.calm || 0) * 0.6,
    "森林绿与暖棕": (scores.forest || 0) + (scores.warm || 0) * 0.5,
    "海蓝与珊瑚色": (scores.ocean || 0) + (scores.social || 0) * 0.35,
    "朱红、墨色与金色": (scores.chinese || 0) + (scores.ritual || 0) * 0.6,
    "高对比霓虹色": (scores.cyber || 0) + (scores.bright || 0) * 0.5,
    "低饱和暗色": (scores.dark || 0) + (scores.mystery || 0) * 0.35,
    "沙金与岩灰": (scores.frontier || 0) + (scores.wasteland || 0) * 0.7,
    "柔和浅色": (scores.soft || 0) + (scores.fluffy || 0) * 0.45,
  });
}

function inferColors(scores: Record<string, number>, explicitPalette?: string) {
  const palette = explicitPalette || inferPaletteHint(scores);
  const palettes: Record<string, CharacterBlueprint["colors"]> = {
    "冷白银灰与冰蓝": { primary: "#D9E2EA", secondary: "#73879A", accent: "#78BEE8", neutral: "#F5F7F8", shadow: "#263442" },
    "森林绿与暖棕": { primary: "#355744", secondary: "#8B6847", accent: "#D2A85B", neutral: "#E8E1D2", shadow: "#1D2A22" },
    "海蓝与珊瑚色": { primary: "#246A84", secondary: "#6FB7C7", accent: "#E77D67", neutral: "#E8F1EF", shadow: "#173747" },
    "朱红、墨色与金色": { primary: "#8E2F2D", secondary: "#24272B", accent: "#D2A84A", neutral: "#EEE4D2", shadow: "#111316" },
    "高对比霓虹色": { primary: "#243047", secondary: "#D94F70", accent: "#45D6C8", neutral: "#E8ECF3", shadow: "#111722" },
    "低饱和暗色": { primary: "#3E4650", secondary: "#6E5D6B", accent: "#9AA7B2", neutral: "#D8D6D2", shadow: "#191D22" },
    "沙金与岩灰": { primary: "#9B7846", secondary: "#66635E", accent: "#D4B46A", neutral: "#E9DFCB", shadow: "#2B2926" },
    "柔和浅色": { primary: "#C9D9D2", secondary: "#D8B7B1", accent: "#8BA9C2", neutral: "#F4EFE8", shadow: "#58636A" },
  };
  return palettes[palette] || palettes["低饱和暗色"];
}

function inferFeatures(blueprint: CharacterBlueprint): CharacterSpec["features"] {
  const motif = blueprint.motifHints[0] || `${blueprint.worldStyle}主题的天然纹理`;
  return {
    ears: `${blueprint.primarySpecies}特征明确的耳部轮廓`,
    tail: blueprint.lineageMode === "pure" ? `${blueprint.primarySpecies}自然尾形` : `${blueprint.primarySpecies}主尾形，融合${blueprint.secondarySpecies.join("、")}局部特征`,
    eyes: `${blueprint.paletteHint}中最清晰的强调色眼睛，瞳形符合${blueprint.primarySpecies}特征`,
    fur: `${blueprint.paletteHint}配色的自然毛色分区与物种纹理`,
    special_marks: motif,
  };
}

function inferOutfit(blueprint: CharacterBlueprint) {
  if (blueprint.outfitHints[0]) return blueprint.outfitHints[0];
  const outfits: Record<string, string> = {
    守卫: "耐用制服与防护披肩", 调查员: "多口袋调查外套与记录装备", 记录者: "便于收纳资料的分层长衣",
    信使: "轻便旅行装与防风围巾", 工匠: "工作围裙、工具腰带与护臂", 旅者: "耐候斗篷与轻量行囊",
    猎手: "安静贴身的户外行动装", 术士: "具有世界观纹样的仪式服", 策士: "剪裁克制的正式制服",
    医者: "柔软便于行动的治疗者服装", 逃亡者: "经过修补的多层旅行服", 斥候: "轻量侦察装与便携收纳带",
  };
  return `${blueprint.worldStyle}风格的${outfits[blueprint.role] || "日常行动服"}`;
}

function inferSignatureItem(blueprint: CharacterBlueprint) {
  if (blueprint.itemHints[0]) return blueprint.itemHints[0];
  if (blueprint.mission.includes("记录")) return "可随身展开的记录终端";
  if (blueprint.mission.includes("希望") || blueprint.mission.includes("灯")) return "封存微光的旅行灯";
  if (blueprint.mission.includes("守护") || blueprint.role === "守卫") return "刻有约定纹样的护符盾牌";
  if (blueprint.role === "工匠") return "模块化维修工具箱";
  if (blueprint.role === "术士") return "承载仪式符号的法器";
  return "记录路线与线索的折叠地图册";
}

function inferScene(blueprint: CharacterBlueprint): CharacterScene {
  const locations: Record<string, string> = {
    赛博: "层叠灯牌与维修平台之间", 神话: "云海神殿与古老石阶前", 森系: "雾气森林与苔藓石碑旁",
    遗迹: "被植物侵入的旧档案遗迹中", 边境: "风沙边境的补给站外", 都市: "雨后城市街区与公共交通节点",
    暗黑: "低光地下大厅与破损壁画前", 海洋: "潮汐栈桥与远海灯塔附近", 夜行幻想: "月夜集市与安静巷道交界处",
  };
  return {
    location: blueprint.sceneHints[0] || locations[blueprint.worldStyle] || "符合世界观的生活场景中",
    action: blueprint.poseHints[0] || `正在执行“${blueprint.mission}”相关行动`,
    composition: "竖版全身角色主视觉，环境信息清晰但不遮挡角色",
    camera: "平视三分之二视角，完整展示脸部、手部、足部和尾巴",
    lighting: `${blueprint.paletteHint}对应的自然主光与柔和轮廓光`,
  };
}

function inferCatchphrase(personality: string[]) {
  const lead = personality[0] || "沉稳";
  return `先按${lead}的方式看清楚，再决定怎么做。`;
}

function pickHighest(scores: Record<string, number>) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))[0]?.[0] || "未定";
}

function formatSpeciesRatio(ratio: Record<string, number>) {
  return Object.entries(ratio).map(([species, value]) => `${species}${value}%`).join("、");
}

function splitList(value?: string) {
  if (!value) return [];
  return value
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPreviewTagGroups(snapshot: ScoreSnapshot): GenerationPreviewTagGroup[] {
  const groups = new Map<string, GenerationPreviewTag[]>();

  for (const [key, score] of Object.entries(snapshot.tags)) {
    const definition = scoreTagDefinitions[key as ScoreTag];
    if (!definition || score <= 0) continue;

    const category = definition.category;
    const current = groups.get(category) || [];
    current.push({
      key,
      label: definition.label,
      score,
    });
    groups.set(category, current);
  }

  return Array.from(groups.entries())
    .map(([category, tags]) => ({
      category,
      categoryLabel: categoryLabels[category] || category,
      tags: tags.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "zh-CN")),
    }))
    .sort((a, b) => {
      const left = categoryOrder.indexOf(a.category);
      const right = categoryOrder.indexOf(b.category);
      return (left === -1 ? 999 : left) - (right === -1 ? 999 : right);
    });
}
