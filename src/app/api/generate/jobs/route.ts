import { NextResponse } from "next/server";
import type { GenerateRequest } from "@/lib/fursona";
import { createQueuedGenerationJob } from "@/lib/asyncJobs";
import {
  assertValidGenerateRequest,
  GenerationRequestError,
} from "@/lib/serverGeneration";
import {
  ensureCreditAccount,
  generationCreditCost,
  insufficientCreditsMessage,
} from "@/lib/userAccounts";
import { assertSameOrigin, AuthInputError } from "@/lib/localAuth";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/userSession";
import { kickGenerationWorker } from "@/lib/generationWorker";

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
    assertValidGenerateRequest(body);

    if (!user.anonymous) ensureCreditAccount(user.id);
    const job = createQueuedGenerationJob({
      userId: user.id,
      kind: "generate",
      cost: user.anonymous ? 0 : generationCreditCost,
      input: body,
    });
    kickGenerationWorker();

    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成任务启动失败。";
    const status =
      error instanceof AuthRequiredError
        ? error.status
        : error instanceof AuthInputError
          ? error.status
        : error instanceof GenerationRequestError
          ? error.status
          : message === insufficientCreditsMessage
            ? 402
            : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
