import {
  buildFallbackCharacterSpec,
  buildImagePrompts,
  inferCharacterBlueprint,
  type CharacterSpec,
  type GenerateRequest,
  withChineseReferenceSheetRules,
} from "@/lib/fursona";
import { toFile } from "openai";
import {
  getOpenAIClient,
  hasOpenAIKey,
  resolveOpenAISettings,
  type OpenAIRequestSettings,
} from "@/lib/openai";
import { characterSpecSchema } from "@/app/api/generate/schema";

export type GenerateResponse = {
  characterSpec: CharacterSpec;
  completeSceneImage: string | null;
  referenceSheetImage: string | null;
  settingDescription: string;
  prompts: CharacterSpec["prompts"];
  imageErrors: {
    completeSceneImage: string | null;
    referenceSheetImage: string | null;
  };
};

export class GenerationRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GenerationRequestError";
    this.status = status;
  }
}

type GeneratedCharacterSpec = Omit<CharacterSpec, "species_ratio"> & {
  species_ratio: Array<{ species: string; ratio: number }>;
};

export function assertValidGenerateRequest(body: GenerateRequest) {
  if (
    !body ||
    (body.mode !== "quick" && body.mode !== "deep") ||
    (body.lineageMode !== "ai" &&
      body.lineageMode !== "pure" &&
      body.lineageMode !== "hybrid")
  ) {
    throw new GenerationRequestError("生成参数不完整。", 400);
  }

  if (!body.confirmedSpec) {
    throw new GenerationRequestError("请先生成并确认完整角色设定。", 400);
  }

  if (!hasOpenAIKey(body.aiSettings)) {
    throw new GenerationRequestError(
      "缺少生成服务密钥。请复制 .env.local.example 为 .env.local 并配置真实 key 后再生成。",
      400,
    );
  }
}

export async function generateFursonaResult(body: GenerateRequest): Promise<GenerateResponse> {
  assertValidGenerateRequest(body);

  const characterSpec = normalizeCharacterSpec(body.confirmedSpec!);
  // Generate the hero image first, then use it as a high-fidelity identity
  // reference for the character sheet. Running both prompts independently made
  // body proportions and character details drift between the two assets.
  const completeSceneImage = await generateSingleImage(
    characterSpec.prompts.complete_scene,
    body.aiSettings,
  );
  const referenceSheetImage = completeSceneImage
    ? await generateImageFromReference(
        characterSpec.prompts.reference_sheet,
        completeSceneImage,
        body.aiSettings,
      )
    : await generateSingleImage(characterSpec.prompts.reference_sheet, body.aiSettings);

  return {
    characterSpec,
    completeSceneImage,
    referenceSheetImage,
    settingDescription: characterSpec.setting_description,
    prompts: characterSpec.prompts,
    imageErrors: {
      completeSceneImage: completeSceneImage ? null : "完整形象图生成失败，可单独重试。",
      referenceSheetImage: referenceSheetImage ? null : "多维度设定图生成失败，可单独重试。",
    },
  };
}

export function assertValidRegenerateImageRequest(prompt: string, settings?: OpenAIRequestSettings) {
  if (!prompt?.trim()) {
    throw new GenerationRequestError("缺少图片描述文本。", 400);
  }

  if (!hasOpenAIKey(settings)) {
    throw new GenerationRequestError("缺少生成服务密钥，无法重新生成图片。", 400);
  }
}

export async function regenerateImage(prompt: string, settings?: OpenAIRequestSettings) {
  assertValidRegenerateImageRequest(prompt, settings);

  const image = await generateSingleImage(prompt, settings);
  if (!image) {
    throw new GenerationRequestError("图片模型没有返回图片。", 502);
  }

  return image;
}

export function assertValidDraftRequest(body: GenerateRequest) {
  if (!body || (body.mode !== "quick" && body.mode !== "deep") || !Array.isArray(body.answers)) {
    throw new GenerationRequestError("设定草案参数不完整。", 400);
  }
  if (!hasOpenAIKey(body.aiSettings)) {
    throw new GenerationRequestError("缺少生成服务密钥，无法生成角色设定。", 400);
  }
}

export async function generateCharacterDraft(
  request: GenerateRequest,
  recentSpecs: CharacterSpec[] = [],
) {
  assertValidDraftRequest(request);
  const blueprint = inferCharacterBlueprint(request);
  const fallback = buildFallbackCharacterSpec(blueprint);

  try {
    const client = getOpenAIClient(request.aiSettings);
    const settings = resolveOpenAISettings(request.aiSettings);
    const response = await client.responses.create({
      model: settings.textModel,
      instructions: [
      "你是一个中文兽设产品的设定师。",
      "基于用户输入和规则引擎草案，生成结构化角色设定。",
      "必须保持血统规则：纯血只有一个物种且比例 100；混血主血统不低于 55%，副血统必须映射到局部特征。",
      "species_ratio 必须输出为数组，每项包含 species 和 ratio，不要输出动态对象键。",
      "name 必须输出为空字符串，不要自动给角色起名。",
      "gender 必须固定输出 male；角色默认为男性，所有外观、背景和设定说明不得改成其他性别。",
      "height 必须是具体厘米身高，例如 172cm，不要写体型、气质或模糊描述。",
      "colors 的五个字段必须全部输出六位十六进制颜色，例如 #4A6072。",
      "主副物种、血统比例、核心性格和主要世界观属于锁定字段，不得修改 rule_engine_draft 中的对应值。",
      "职业、配色、毛色、眼睛、特殊标记、服装、道具、背景故事、口头禅与场景必须根据标签和答案效果扩写。",
      "scene 必须具体描述地点、动作、构图、镜头和光照，并与任务、职业和世界观一致。",
      "最近角色仅用于避免原样复用未锁定字段，不得因此改变锁定字段。",
      "mission、signature_item、must_keep、avoid 只作内部生成约束，不要写进 setting_description。",
      "prompts 三个字段统一输出空字符串，系统会在锁定设定后确定性构建图片提示词。",
      "禁止无依据复用斥候、青橙配色、青绿色眼睛、月牙标记、轻装护具或追踪刃等默认元素。",
      ].join("\n"),
      input: JSON.stringify(
        {
          user_request: request,
          score_snapshot: request.scoreSnapshot,
          rule_engine_draft: blueprint,
          recent_expansions_to_avoid: recentSpecs.slice(0, 10).map(summarizeSpecForNovelty),
        },
        null,
        2,
      ),
      text: {
        format: {
          type: "json_schema",
          name: "character_spec",
          schema: characterSpecSchema,
          strict: true,
        },
      },
    });

    if (!response.output_text?.trim()) {
      throw new Error("Text model returned an empty character specification");
    }

    const parsed = JSON.parse(response.output_text) as GeneratedCharacterSpec;
    const generated = convertGeneratedSpec(parsed);
    return normalizeCharacterSpec({
      ...generated,
      name: "",
      gender: "male",
      lineage_mode: blueprint.lineageMode,
      primary_species: blueprint.primarySpecies,
      secondary_species: blueprint.secondarySpecies,
      species_ratio: blueprint.speciesRatio,
      world_style: blueprint.worldStyle,
      personality_keywords: blueprint.personalityKeywords,
      positioning: `${blueprint.worldStyle} · ${generated.role}`,
      must_keep: Array.from(new Set([...blueprint.mustKeep, ...generated.must_keep])),
      avoid: Array.from(new Set([...blueprint.avoid, ...generated.avoid])),
    });
  } catch (error) {
    console.error("Character draft generation failed; using rule-engine fallback.", error);
    return normalizeCharacterSpec(fallback);
  }
}

export async function generateSingleImage(
  prompt: string,
  requestSettings?: OpenAIRequestSettings,
) {
  const client = getOpenAIClient(requestSettings);
  const settings = resolveOpenAISettings(requestSettings);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await client.images.generate({
        model: settings.imageModel,
        prompt,
        size: "1024x1536",
        quality: "medium",
        output_format: "png",
        n: 1,
      });
      return readGeneratedImage(response.data?.[0]);
    } catch (error) {
      if (attempt === 3 || !isRetryableImageError(error)) {
        console.error("Image generation failed.", error);
        return null;
      }
      await wait(attempt * 750);
    }
  }

  return null;
}

function isRetryableImageError(error: unknown) {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status !== "number") return true;
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImageFromReference(
  prompt: string,
  referenceImage: string,
  requestSettings?: OpenAIRequestSettings,
) {
  const identityPrompt = [
    "以输入的完整形象图作为唯一角色身份参考。",
    "必须保持同一角色的物种、体态比例、脸型、毛色、斑纹、耳朵、尾巴、角、服装、配饰和随身物品一致；只改变排版、视角和表情，不要重新设计角色。",
    prompt,
  ].join("\n");

  try {
    const client = getOpenAIClient(requestSettings);
    const settings = resolveOpenAISettings(requestSettings);
    const response = await client.images.edit({
      model: settings.imageModel,
      image: await imageToUpload(referenceImage),
      prompt: identityPrompt,
      size: "1024x1536",
      quality: "medium",
      output_format: "png",
      input_fidelity: "high",
      n: 1,
    });
    return readGeneratedImage(response.data?.[0]);
  } catch {
    // OpenAI-compatible providers may not implement image edits. Keep the
    // generation usable while retaining the stronger identity instructions.
    return generateSingleImage(identityPrompt, requestSettings);
  }
}

async function imageToUpload(image: string) {
  const dataUrl = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrl) {
    return toFile(Buffer.from(dataUrl[2], "base64"), "complete-scene.png", {
      type: dataUrl[1],
    });
  }

  const response = await fetch(image);
  if (!response.ok) throw new Error("角色参考图读取失败。");
  const mimeType = response.headers.get("content-type") || "image/png";
  return toFile(Buffer.from(await response.arrayBuffer()), "complete-scene.png", {
    type: mimeType,
  });
}

function readGeneratedImage(image: { b64_json?: string | null; url?: string | null } | undefined) {
  if (image?.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }
  return image?.url || null;
}

function convertGeneratedSpec(spec: GeneratedCharacterSpec): CharacterSpec {
  return {
    ...spec,
    species_ratio: Object.fromEntries(
      spec.species_ratio.map((item) => [item.species, item.ratio]),
    ),
  };
}

export function normalizeCharacterSpec(spec: CharacterSpec) {
  const legacy = spec as CharacterSpec & { world_style?: string; role?: string; scene?: CharacterSpec["scene"] };
  const normalized: CharacterSpec = {
    ...spec,
    name: "",
    gender: "male",
    height: spec.height.trim(),
    world_style: legacy.world_style?.trim() || inferLegacyWorldStyle(spec.positioning),
    role: legacy.role?.trim() || inferLegacyRole(spec.positioning),
    scene: legacy.scene || {
      location: "符合角色世界观的主要活动区域",
      action: `正在执行“${spec.mission}”相关行动`,
      composition: "竖版全身角色主视觉，环境信息清晰但不遮挡角色",
      camera: "平视三分之二视角，完整展示脸部、手部、足部和尾巴",
      lighting: "符合核心配色的自然主光与柔和轮廓光",
    },
    prompts: spec.prompts || { complete_scene: "", reference_sheet: "", avatar: "" },
  };

  if (!/^\d{2,3}\s*cm$/i.test(normalized.height)) {
    throw new GenerationRequestError("生成结果缺少具体身高，请重新生成。", 502);
  }

  const lineageNormalized = normalized.lineage_mode === "pure"
    ? {
      ...normalized,
      secondary_species: [],
      species_ratio: { [normalized.primary_species]: 100 },
      avoid: Array.from(new Set([...normalized.avoid, "不要混入其他物种的显著特征"])),
    }
    : normalized;

  const primaryRatio = lineageNormalized.species_ratio[lineageNormalized.primary_species] || 0;
  if (lineageNormalized.lineage_mode === "hybrid" && primaryRatio < 55) {
    throw new GenerationRequestError("生成结果主血统比例过低，请重新生成。", 502);
  }

  const requiredText = [
    lineageNormalized.world_style, lineageNormalized.role, lineageNormalized.body,
    lineageNormalized.features.eyes, lineageNormalized.features.fur,
    lineageNormalized.features.special_marks, lineageNormalized.outfit,
    lineageNormalized.signature_item, ...Object.values(lineageNormalized.scene),
  ];
  if (requiredText.some((value) => !value?.trim())) {
    throw new GenerationRequestError("角色设定缺少完整视觉字段，请重新生成草案。", 502);
  }
  if (Object.values(lineageNormalized.colors).some((value) => !/^#[0-9a-f]{6}$/i.test(value))) {
    throw new GenerationRequestError("角色配色必须使用六位十六进制颜色。", 502);
  }

  const generatedPrompts = buildImagePrompts(lineageNormalized);
  const prompts = {
    complete_scene: lineageNormalized.prompts.complete_scene.trim()
      ? withImageTextRule(lineageNormalized.prompts.complete_scene)
      : generatedPrompts.complete_scene,
    reference_sheet: lineageNormalized.prompts.reference_sheet.trim()
      ? withChineseReferenceSheetRules(lineageNormalized.prompts.reference_sheet)
      : generatedPrompts.reference_sheet,
    avatar: lineageNormalized.prompts.avatar.trim()
      ? withImageTextRule(lineageNormalized.prompts.avatar)
      : generatedPrompts.avatar,
  };
  return { ...lineageNormalized, positioning: `${lineageNormalized.world_style} · ${lineageNormalized.role}`, prompts };
}

function summarizeSpecForNovelty(spec: CharacterSpec) {
  return {
    role: spec.role,
    colors: spec.colors,
    outfit: spec.outfit,
    signature_item: spec.signature_item,
    special_marks: spec.features.special_marks,
    scene: spec.scene,
  };
}

function inferLegacyWorldStyle(positioning: string) {
  return ["赛博", "神话", "森系", "遗迹", "边境", "都市", "暗黑", "海洋", "夜行幻想"]
    .find((item) => positioning.includes(item)) || "夜行幻想";
}

function inferLegacyRole(positioning: string) {
  const world = inferLegacyWorldStyle(positioning);
  const role = positioning.replace(world, "").replace(/[·\s]/g, "").trim();
  return role || "旅者";
}

function withImageTextRule(prompt: string) {
  const rule = "no visible text, no character name, no labels, no typography, no watermark";
  return prompt.includes(rule) ? prompt : `${prompt}, ${rule}`;
}
