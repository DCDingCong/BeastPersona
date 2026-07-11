import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  return NextResponse.json(
    { error: "公网生成已切换为异步队列，请使用 /api/generate/jobs。" },
    { status: 409 },
  );
}
