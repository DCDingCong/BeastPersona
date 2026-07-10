import { NextResponse } from "next/server";
import type { GenerateRequest } from "@/lib/fursona";
import {
  assertValidGenerateRequest,
  GenerationRequestError,
} from "@/lib/serverGeneration";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: GenerateRequest;

  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  try {
    assertValidGenerateRequest(body);

    return NextResponse.json(
      { error: "公网生成已切换为异步队列，请使用 /api/generate/jobs。" },
      { status: 409 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成失败。",
      },
      { status: error instanceof GenerationRequestError ? error.status : 502 },
    );
  }
}
