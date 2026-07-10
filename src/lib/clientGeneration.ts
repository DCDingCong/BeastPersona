import {
  type CharacterSpec,
  type GenerateRequest,
  withChineseReferenceSheetRules,
} from "@/lib/fursona";
import {
  defaultImageModel,
  sanitizeOpenAISettings,
  type OpenAIRequestSettings,
} from "@/lib/openaiSettings";

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

export type ClientGenerateResponse = {
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

export type PostJson = (
  url: string,
  body: Record<string, unknown>,
  apiKey: string,
) => Promise<OpenAIImageResponse>;

export function buildOpenAIEndpoint(baseURL: string | undefined, path: string) {
  const normalizedBase = (baseURL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

export function canUseClientGeneration(settings?: OpenAIRequestSettings) {
  return Boolean(sanitizeOpenAISettings(settings).apiKey);
}

export async function generateClientImage(
  prompt: string,
  settings: OpenAIRequestSettings,
  postJson: PostJson = postOpenAIJson,
) {
  const sanitized = sanitizeOpenAISettings(settings);

  if (!sanitized.apiKey) {
    throw new Error("Missing API key for Android/browser direct generation.");
  }

  const response = await postJson(
    buildOpenAIEndpoint(sanitized.baseURL, "/images/generations"),
    {
      model: sanitized.imageModel || defaultImageModel,
      prompt,
      size: "1024x1536",
      quality: "medium",
      output_format: "png",
      n: 1,
    },
    sanitized.apiKey,
  );
  const image = response.data?.[0];

  if (image?.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }

  if (image?.url) {
    return image.url;
  }

  throw new Error(response.error?.message || "Image model did not return an image.");
}

export async function generateClientResult(
  payload: GenerateRequest,
  settings: OpenAIRequestSettings,
): Promise<ClientGenerateResponse> {
  if (!payload.confirmedSpec) {
    throw new Error("Android/browser direct generation requires a confirmed character spec.");
  }

  const characterSpec = {
    ...payload.confirmedSpec,
    prompts: {
      ...payload.confirmedSpec.prompts,
      reference_sheet: withChineseReferenceSheetRules(
        payload.confirmedSpec.prompts.reference_sheet,
      ),
    },
  };
  const [completeSceneImage, referenceSheetImage] = await Promise.all([
    generateClientImage(characterSpec.prompts.complete_scene, settings).catch(() => null),
    generateClientImage(characterSpec.prompts.reference_sheet, settings).catch(() => null),
  ]);

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

async function postOpenAIJson(url: string, body: Record<string, unknown>, apiKey: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as OpenAIImageResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI-compatible request failed: ${response.status}`);
  }

  return data;
}
