import { NextResponse } from "next/server";
import {
  getOpenAIClient,
  hasOpenAIKey,
  resolveOpenAISettings,
  type OpenAIRequestSettings,
} from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

type RegenerateImageRequest = {
  prompt: string;
  aiSettings?: OpenAIRequestSettings;
};

export async function POST(request: Request) {
  let body: RegenerateImageRequest;

  try {
    body = (await request.json()) as RegenerateImageRequest;
  } catch {
    return NextResponse.json({ error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "缺少图片描述文本。" }, { status: 400 });
  }

  if (!hasOpenAIKey(body.aiSettings)) {
    return NextResponse.json(
      { error: "缺少生成服务密钥，无法重新生成图片。" },
      { status: 400 },
    );
  }

  try {
    const client = getOpenAIClient(body.aiSettings);
    const settings = resolveOpenAISettings(body.aiSettings);
    const response = await client.images.generate({
      model: settings.imageModel,
      prompt: body.prompt,
      size: "1024x1536",
      quality: "medium",
      output_format: "png",
      n: 1,
    });
    const image = response.data?.[0];
    const src = image?.b64_json
      ? `data:image/png;base64,${image.b64_json}`
      : image?.url || null;

    if (!src) {
      return NextResponse.json({ error: "图片模型没有返回图片。" }, { status: 502 });
    }

    return NextResponse.json({ image: src });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "图片重新生成失败。" },
      { status: 502 },
    );
  }
}
