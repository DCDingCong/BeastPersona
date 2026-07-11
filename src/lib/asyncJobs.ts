import { randomUUID } from "node:crypto";
import type { GenerateRequest } from "./fursona";
import { getDatabase, withImmediateTransaction } from "./localDatabase";
import {
  ensureCreditAccount,
  generationCreditCost,
  insufficientCreditsMessage,
} from "./userAccounts";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";
export type JobKind = "generate" | "regenerate-image";
export type ImageKind = "complete_scene" | "reference_sheet";

export type QueuedGenerationJob = {
  jobId: string;
  status: JobStatus;
  credits: number;
};

export type GenerationJobRecord = {
  id: string;
  userId: string;
  kind: JobKind;
  status: JobStatus;
  cost: number;
  input: GenerateRequest | Record<string, unknown>;
  imageKind: ImageKind | null;
  sourceResultId: string | null;
  resultId?: string | null;
  error?: string | null;
};

export type GenerationJobRow = {
  id: string;
  user_id: string;
  kind: JobKind;
  status: JobStatus;
  cost: number;
  input_json: string;
  image_kind: ImageKind | null;
  source_result_id: string | null;
  result_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export function createQueuedGenerationJob({
  userId,
  kind,
  cost = generationCreditCost,
  input,
  imageKind = null,
  sourceResultId = null,
}: {
  userId: string;
  kind: JobKind;
  cost?: number;
  input: GenerateRequest | Record<string, unknown>;
  imageKind?: ImageKind | null;
  sourceResultId?: string | null;
}) {
  if (cost > 0) ensureCreditAccount(userId);

  return withImmediateTransaction((database) => {
    let remainingCredits = 0;
    if (cost > 0) {
      const account = database
        .prepare("SELECT credits FROM credit_accounts WHERE user_id = ?")
        .get(userId) as { credits: number } | undefined;
      if (!account || account.credits < cost) {
        throw new Error(insufficientCreditsMessage);
      }
      remainingCredits = account.credits - cost;
      database
        .prepare("UPDATE credit_accounts SET credits = ?, updated_at = ? WHERE user_id = ?")
        .run(remainingCredits, new Date().toISOString(), userId);
    }

    const jobId = randomUUID();
    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO generation_jobs (
        id, user_id, kind, status, cost, input_json, image_kind, source_result_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      userId,
      kind,
      cost,
      JSON.stringify(input),
      imageKind,
      sourceResultId,
      now,
      now,
    );

    if (cost > 0) {
      database.prepare(`
        INSERT INTO credit_transactions (id, user_id, amount, type, reason, job_id, created_at)
        VALUES (?, ?, ?, 'generation_reserve', ?, ?, ?)
      `).run(randomUUID(), userId, -cost, "生成任务扣费", jobId, now);
    }

    return {
      jobId,
      status: "queued",
      credits: remainingCredits,
    } satisfies QueuedGenerationJob;
  });
}

export function claimNextGenerationJob(leaseSeconds = 900) {
  return withImmediateTransaction((database) => {
    const now = new Date();
    const nowIso = now.toISOString();
    database.prepare(`
      UPDATE generation_jobs
      SET status = 'queued', lease_until = NULL, updated_at = ?
      WHERE status = 'running' AND lease_until IS NOT NULL AND lease_until <= ?
    `).run(nowIso, nowIso);

    const row = database.prepare(`
      SELECT * FROM generation_jobs
      WHERE status = 'queued'
      ORDER BY created_at ASC
      LIMIT 1
    `).get() as GenerationJobRow | undefined;
    if (!row) return null;

    database.prepare(`
      UPDATE generation_jobs
      SET status = 'running', lease_until = ?, attempts = attempts + 1,
          started_at = COALESCE(started_at, ?), updated_at = ?
      WHERE id = ? AND status = 'queued'
    `).run(
      new Date(now.getTime() + leaseSeconds * 1000).toISOString(),
      nowIso,
      nowIso,
      row.id,
    );

    return mapGenerationJob({ ...row, status: "running", updated_at: nowIso });
  });
}

export function getGenerationQueuePosition(jobId: string) {
  const database = getDatabase();
  const job = database
    .prepare("SELECT status, created_at FROM generation_jobs WHERE id = ?")
    .get(jobId) as { status: JobStatus; created_at: string } | undefined;
  if (!job || job.status !== "queued") return null;

  const row = database.prepare(`
    SELECT COUNT(*) AS position
    FROM generation_jobs
    WHERE status = 'queued' AND created_at <= ?
  `).get(job.created_at) as { position: number };
  return Number(row.position);
}

export function mapGenerationJob(row: GenerationJobRow): GenerationJobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    status: row.status,
    cost: row.cost,
    input: JSON.parse(row.input_json) as GenerateRequest | Record<string, unknown>,
    imageKind: row.image_kind || null,
    sourceResultId: row.source_result_id || null,
    resultId: row.result_id || null,
    error: row.error || null,
  };
}
