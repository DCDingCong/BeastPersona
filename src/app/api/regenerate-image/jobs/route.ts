import { NextResponse } from "next/server";
import type { OpenAIRequestSettings } from "@/lib/openai";
import {
  createQueuedGenerationJob,
  type ImageKind,
} from "@/lib/asyncJobs";
import { getResultForWorker } from "@/lib/generationRepository";
import { GenerationRequestError } from "@/lib/serverGeneration";
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

type RegenerateImageRequest = {
  resultId: string;
  imageKind: ImageKind;
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
    assertValidRegenerateJobRequest(body);
    assertSameOrigin(request);
    const user = await requireAuthenticatedUser();
    if (!user.anonymous) ensureCreditAccount(user.id);
    getResultForWorker(user.id, body.resultId);

    const job = createQueuedGenerationJob({
      userId: user.id,
      kind: "regenerate-image",
      cost: user.anonymous ? 0 : generationCreditCost,
      input: { aiSettings: body.aiSettings },
      imageKind: body.imageKind,
      sourceResultId: body.resultId,
    });
    kickGenerationWorker();

    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片生成任务启动失败。";
    const status =
      error instanceof AuthRequiredError
        ? error.status
        : error instanceof AuthInputError
          ? error.status
        : error instanceof GenerationRequestError
          ? error.status
          : message === insufficientCreditsMessage
            ? 402
            : message === "历史结果不存在。"
              ? 404
              : 502;

    return NextResponse.json({ error: message }, { status });
  }
}

function assertValidRegenerateJobRequest(body: RegenerateImageRequest) {
  if (
    !body?.resultId ||
    (body.imageKind !== "complete_scene" && body.imageKind !== "reference_sheet")
  ) {
    throw new GenerationRequestError("重绘参数不完整。", 400);
  }
}
