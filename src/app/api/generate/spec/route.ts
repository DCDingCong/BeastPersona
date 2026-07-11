import { NextResponse } from "next/server";
import type { GenerateRequest } from "@/lib/fursona";
import { listRecentCharacterSpecsForUser } from "@/lib/generationRepository";
import { scoreAnswers } from "@/lib/scoring";
import {
  assertValidDraftRequest,
  generateCharacterDraft,
  GenerationRequestError,
} from "@/lib/serverGeneration";
import { assertSameOrigin, AuthInputError } from "@/lib/localAuth";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/userSession";

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
    assertSameOrigin(request);
    const user = await requireAuthenticatedUser();
    assertValidDraftRequest(body);
    const scoreSnapshot = scoreAnswers(body.answers || []);
    const characterSpec = await generateCharacterDraft(
      { ...body, scoreSnapshot, confirmedSpec: undefined },
      listRecentCharacterSpecsForUser(user.id, 10),
    );
    return NextResponse.json({ characterSpec, scoreSnapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "角色设定生成失败。";
    const status =
      error instanceof AuthRequiredError || error instanceof AuthInputError || error instanceof GenerationRequestError
        ? error.status
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
