import { NextResponse } from "next/server";
import { getGenerationQueuePosition } from "@/lib/asyncJobs";
import {
  getGenerationJobForUser,
  getRegeneratedImageResponseForUser,
} from "@/lib/generationRepository";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/userSession";
import { kickGenerationWorker } from "@/lib/generationWorker";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { jobId } = await context.params;
    const job = getGenerationJobForUser(user.id, jobId);

    if (!job) {
      return NextResponse.json({ error: "图片生成任务不存在或已过期。" }, { status: 404 });
    }

    if (job.status === "queued" || job.status === "running") {
      kickGenerationWorker();
    }

    const result =
      job.status === "succeeded"
        ? getRegeneratedImageResponseForUser(user.id, job.id)
        : undefined;

    return NextResponse.json({
      status: job.status,
      queuePosition: getGenerationQueuePosition(job.id),
      result,
      error: job.status === "failed" ? job.error : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "图片生成任务查询失败。" },
      { status: error instanceof AuthRequiredError ? error.status : 500 },
    );
  }
}
