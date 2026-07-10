import { NextResponse } from "next/server";
import { getGenerationQueuePosition } from "@/lib/asyncJobs";
import {
  getGenerationJobForUser,
  getResultResponseForUser,
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
      return NextResponse.json({ error: "生成任务不存在或已过期。" }, { status: 404 });
    }

    kickGenerationWorker();

    const result =
      job.status === "succeeded" && job.result_id
        ? getResultResponseForUser(user.id, job.result_id)
        : undefined;

    return NextResponse.json({
      status: job.status,
      resultId: job.result_id || undefined,
      queuePosition: getGenerationQueuePosition(job.id),
      result,
      error: job.status === "failed" ? job.error : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成任务查询失败。" },
      { status: error instanceof AuthRequiredError ? error.status : 500 },
    );
  }
}
