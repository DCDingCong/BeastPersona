import { NextResponse } from "next/server";
import type { OpenAIRequestSettings } from "@/lib/openai";
import {
  assertValidRegenerateImageRequest,
  GenerationRequestError,
} from "@/lib/serverGeneration";

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

  try {
    assertValidRegenerateImageRequest(body.prompt, body.aiSettings);

    return NextResponse.json(
      { error: "公网图片生成已切换为异步队列，请使用 /api/regenerate-image/jobs。" },
      { status: 409 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "图片重新生成失败。",
      },
      { status: error instanceof GenerationRequestError ? error.status : 502 },
    );
  }
}
