import { NextResponse } from "next/server";
import {
  inferCharacterBlueprint,
  type CharacterSpec,
  type GenerateRequest,
} from "@/lib/fursona";
import { getImageModel, getOpenAIClient, getTextModel, hasOpenAIKey } from "@/lib/openai";
import { characterSpecSchema } from "./schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: GenerateRequest;

  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  if (!isGenerateRequest(body)) {
    return NextResponse.json({ error: "生成参数不完整。" }, { status: 400 });
  }

  if (!hasOpenAIKey()) {
    return NextResponse.json(
      {
        error:
          "缺少生成服务密钥。请复制 .env.local.example 为 .env.local 并配置真实 key 后再生成。",
      },
      { status: 400 },
    );
  }

  try {
    const characterSpec = body.confirmedSpec
      ? normalizeCharacterSpec(body.confirmedSpec)
      : await generateCharacterSpec(body);
    const [completeSceneImage, referenceSheetImage] = await Promise.all([
      generateImage(characterSpec.prompts.complete_scene),
      generateImage(characterSpec.prompts.reference_sheet),
    ]);

    return NextResponse.json({
      characterSpec,
      completeSceneImage,
      referenceSheetImage,
      settingDescription: characterSpec.setting_description,
      prompts: characterSpec.prompts,
      imageErrors: {
        completeSceneImage: completeSceneImage ? null : "完整形象图生成失败，可单独重试。",
        referenceSheetImage: referenceSheetImage ? null : "多维度设定图生成失败，可单独重试。",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成失败。",
      },
      { status: 502 },
    );
  }
}

type GeneratedCharacterSpec = Omit<CharacterSpec, "species_ratio"> & {
  species_ratio: Array<{ species: string; ratio: number }>;
};

async function generateCharacterSpec(request: GenerateRequest) {
  const client = getOpenAIClient();
  const blueprint = inferCharacterBlueprint(request);
  const response = await client.responses.create({
    model: getTextModel(),
    instructions: [
      "你是一个中文兽设产品的设定师。",
      "基于用户输入和规则引擎草案，生成结构化角色设定。",
      "必须保持血统规则：纯血只有一个物种且比例 100；混血主血统不低于 55%，副血统必须映射到局部特征。",
      "species_ratio 必须输出为数组，每项包含 species 和 ratio，不要输出动态对象键。",
      "name 必须输出为空字符串，不要自动给角色起名。",
      "height 必须是具体厘米身高，例如 172cm，不要写体型、气质或模糊描述。",
      "根据 score_snapshot 的标签生成角色故事、人物设定集，再用人物设定集和世界背景组织完整形象图 prompt。",
      "mission、signature_item、must_keep、avoid 只作为内部生成约束，不要写进 setting_description。",
      "complete_scene prompt 必须包含英文约束：no visible text, no character name, no labels, no typography, no watermark。",
      "reference_sheet prompt 必须是竖版 A4 角色设定板：左侧资料栏，中间主视图和背视图，右侧 3x3 表情格，下方细节特写、服装变化、随身物品、色板、个人空间、三视图和信息块。",
      "reference_sheet 可以允许短标题和短标签，但不要要求长段落、角色名、签名或水印；文字应是辅助层级，不要压过角色图。",
      "avatar prompt 不要要求图片内出现角色名、标题、签名或文字标签。",
      "输出要适合生成完整形象图、多维度设定图和给画师看的设定说明。",
    ].join("\n"),
    input: JSON.stringify(
      {
        user_request: request,
        score_snapshot: request.scoreSnapshot,
        rule_engine_draft: blueprint,
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

  const parsed = JSON.parse(response.output_text) as GeneratedCharacterSpec;
  return normalizeCharacterSpec(convertGeneratedSpec(parsed));
}

async function generateImage(prompt: string) {
  try {
    const client = getOpenAIClient();
    const response = await client.images.generate({
      model: getImageModel(),
      prompt,
      size: "1024x1536",
      quality: "medium",
      output_format: "png",
      n: 1,
    });
    const image = response.data?.[0];

    if (image?.b64_json) {
      return `data:image/png;base64,${image.b64_json}`;
    }

    return image?.url || null;
  } catch {
    return null;
  }
}

function convertGeneratedSpec(spec: GeneratedCharacterSpec): CharacterSpec {
  return {
    ...spec,
    species_ratio: Object.fromEntries(
      spec.species_ratio.map((item) => [item.species, item.ratio]),
    ),
  };
}

function normalizeCharacterSpec(spec: CharacterSpec) {
  const normalized = {
    ...spec,
    name: "",
    height: spec.height.trim(),
    prompts: {
      ...spec.prompts,
      complete_scene: withImageTextRule(spec.prompts.complete_scene),
      reference_sheet: withReferenceSheetLayoutRule(spec.prompts.reference_sheet),
      avatar: withImageTextRule(spec.prompts.avatar),
    },
  };

  if (!/^\d{2,3}\s*cm$/i.test(normalized.height)) {
    throw new Error("生成结果缺少具体身高，请重新生成。");
  }

  if (normalized.lineage_mode === "pure") {
    return {
      ...normalized,
      secondary_species: [],
      species_ratio: { [normalized.primary_species]: 100 },
      avoid: Array.from(
        new Set([...normalized.avoid, "不要混入其他物种的显著特征"]),
      ),
    };
  }

  const primaryRatio = normalized.species_ratio[normalized.primary_species] || 0;
  if (primaryRatio < 55) {
    throw new Error("生成结果主血统比例过低，请重新生成。");
  }

  return normalized;
}

function withImageTextRule(prompt: string) {
  const rule = "no visible text, no character name, no labels, no typography, no watermark";
  return prompt.includes(rule) ? prompt : `${prompt}, ${rule}`;
}

function withReferenceSheetLayoutRule(prompt: string) {
  const layoutRule = [
    "vertical A4 portrait character reference sheet",
    "large full body front and back views",
    "left biography column",
    "right 3x3 expression grid",
    "detail close-up panels",
    "outfit variation row",
    "items panel",
    "color palette swatches",
    "personal space scene panel",
    "bottom turnaround strip",
    "thin divider lines",
    "short headings only, no long paragraphs, no watermark",
  ].join(", ");

  return prompt.includes("vertical A4 portrait character reference sheet")
    ? prompt
    : `${prompt}, ${layoutRule}`;
}

function isGenerateRequest(value: GenerateRequest) {
  return (
    value &&
    (value.mode === "quick" || value.mode === "deep") &&
    (value.lineageMode === "ai" ||
      value.lineageMode === "pure" ||
      value.lineageMode === "hybrid")
  );
}
