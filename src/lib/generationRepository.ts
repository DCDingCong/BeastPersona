import { randomUUID } from "node:crypto";
import type { GenerateResponse } from "./serverGeneration";
import type { GenerationJobRow, ImageKind, JobKind, JobStatus } from "./asyncJobs";
import { createAssetUrls, type StoredAsset } from "./generationStorage";
import { getDatabase, withImmediateTransaction } from "./localDatabase";

type JobRow = {
  id: string;
  kind: JobKind;
  status: JobStatus;
  cost: number;
  created_at: string;
  updated_at: string;
  error: string | null;
};

type ResultRow = {
  id: string;
  job_id: string;
  character_spec_json: string;
  setting_description: string;
  prompts_json: string;
  created_at: string;
  updated_at: string;
};

type AssetRow = {
  id: string;
  result_id: string;
  kind: ImageKind;
  storage_path: string;
};

export function listUserJobs(userId: string) {
  const rows = getDatabase().prepare(`
    SELECT id, kind, status, cost, created_at, updated_at, error
    FROM generation_jobs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(userId) as JobRow[];

  return rows.map((job) => ({
    id: job.id,
    kind: job.kind,
    status: job.status,
    cost: job.cost,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    error: job.error || undefined,
  }));
}

export function listUserResults(userId: string) {
  const rows = getDatabase().prepare(`
    SELECT id, job_id, character_spec_json, setting_description, prompts_json, created_at, updated_at
    FROM generation_results
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(userId) as ResultRow[];
  const assets = listAssetsForResults(rows.map((row) => row.id));

  return rows.map((row) => {
    const characterSpec = parseJson<GenerateResponse["characterSpec"]>(row.character_spec_json);
    return {
      id: row.id,
      jobId: row.job_id,
      title: characterSpec.positioning || characterSpec.primary_species || "历史生成",
      createdAt: row.created_at,
      assets: createAssetUrls(assets.get(row.id) || []),
    };
  });
}

export function getGenerationJobForUser(userId: string, jobId: string) {
  return (getDatabase().prepare(`
    SELECT * FROM generation_jobs WHERE id = ? AND user_id = ?
  `).get(jobId, userId) as GenerationJobRow | undefined) || null;
}

export function getResultResponseForUser(userId: string, resultId: string) {
  const row = getDatabase().prepare(`
    SELECT id, job_id, character_spec_json, setting_description, prompts_json, created_at, updated_at
    FROM generation_results
    WHERE id = ? AND user_id = ?
  `).get(resultId, userId) as ResultRow | undefined;
  if (!row) return null;

  const assets = listAssetsForResults([resultId]);
  const urls = createAssetUrls(assets.get(resultId) || []);
  return {
    characterSpec: parseJson<GenerateResponse["characterSpec"]>(row.character_spec_json),
    completeSceneImage: urls.completeSceneUrl || null,
    referenceSheetImage: urls.referenceSheetUrl || null,
    settingDescription: row.setting_description,
    prompts: parseJson<GenerateResponse["prompts"]>(row.prompts_json),
    imageErrors: {
      completeSceneImage: urls.completeSceneUrl ? null : "完整形象图暂不可用。",
      referenceSheetImage: urls.referenceSheetUrl ? null : "多维度设定图暂不可用。",
    },
  } satisfies GenerateResponse;
}

export function getResultForWorker(userId: string, resultId: string) {
  const row = getDatabase().prepare(`
    SELECT id, character_spec_json, setting_description, prompts_json
    FROM generation_results
    WHERE id = ? AND user_id = ?
  `).get(resultId, userId) as Omit<ResultRow, "job_id" | "created_at" | "updated_at"> | undefined;
  if (!row) throw new Error("历史结果不存在。");

  return {
    id: row.id,
    characterSpec: parseJson<GenerateResponse["characterSpec"]>(row.character_spec_json),
    settingDescription: row.setting_description,
    prompts: parseJson<GenerateResponse["prompts"]>(row.prompts_json),
  };
}

export function createGenerationResult({
  userId,
  jobId,
  result,
}: {
  userId: string;
  jobId: string;
  result: GenerateResponse;
}) {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDatabase().prepare(`
    INSERT INTO generation_results (
      id, user_id, job_id, character_spec_json, setting_description,
      prompts_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    jobId,
    JSON.stringify(result.characterSpec),
    result.settingDescription,
    JSON.stringify(result.prompts),
    now,
    now,
  );
  return id;
}

export function createGenerationAsset({
  userId,
  resultId,
  jobId,
  kind,
  storagePath,
  mimeType,
}: {
  userId: string;
  resultId: string;
  jobId: string;
  kind: ImageKind;
  storagePath: string;
  mimeType: string;
}) {
  const id = randomUUID();
  getDatabase().prepare(`
    INSERT INTO generation_assets (
      id, user_id, result_id, job_id, kind, storage_path, mime_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, resultId, jobId, kind, storagePath, mimeType, new Date().toISOString());
  return id;
}

export function completeGenerationJob(jobId: string, resultId: string) {
  const now = new Date().toISOString();
  getDatabase().prepare(`
    UPDATE generation_jobs
    SET status = 'succeeded', result_id = ?, lease_until = NULL,
        error = NULL, finished_at = ?, updated_at = ?
    WHERE id = ? AND status = 'running'
  `).run(resultId, now, now, jobId);
}

export function failGenerationJob(jobId: string, errorMessage: string) {
  withImmediateTransaction((database) => {
    const job = database.prepare(`
      SELECT user_id, cost, status FROM generation_jobs WHERE id = ?
    `).get(jobId) as { user_id: string; cost: number; status: JobStatus } | undefined;
    if (!job || job.status === "failed" || job.status === "succeeded") return;

    const now = new Date().toISOString();
    database.prepare(`
      UPDATE generation_jobs
      SET status = 'failed', error = ?, lease_until = NULL, finished_at = ?, updated_at = ?
      WHERE id = ?
    `).run(errorMessage.slice(0, 1000), now, now, jobId);

    if (job.cost > 0) {
      database.prepare(`
        UPDATE credit_accounts SET credits = credits + ?, updated_at = ? WHERE user_id = ?
      `).run(job.cost, now, job.user_id);
      database.prepare(`
        INSERT INTO credit_transactions (id, user_id, amount, type, reason, job_id, created_at)
        VALUES (?, ?, ?, 'generation_refund', ?, ?, ?)
      `).run(randomUUID(), job.user_id, job.cost, "生成失败退款", jobId, now);
    }
  });
}

export function getRegeneratedImageResponseForUser(userId: string, jobId: string) {
  const row = getDatabase().prepare(`
    SELECT id, result_id, kind, storage_path
    FROM generation_assets
    WHERE user_id = ? AND job_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, jobId) as AssetRow | undefined;
  if (!row) return null;

  const urls = createAssetUrls([{ id: row.id, kind: row.kind, storagePath: row.storage_path }]);
  return { image: urls.completeSceneUrl || urls.referenceSheetUrl || null };
}

function listAssetsForResults(resultIds: string[]) {
  const grouped = new Map<string, StoredAsset[]>();
  if (resultIds.length === 0) return grouped;

  const placeholders = resultIds.map(() => "?").join(", ");
  const rows = getDatabase().prepare(`
    SELECT id, result_id, kind, storage_path
    FROM generation_assets
    WHERE result_id IN (${placeholders})
    ORDER BY created_at DESC
  `).all(...resultIds) as AssetRow[];

  for (const row of rows) {
    const current = grouped.get(row.result_id) || [];
    if (!current.some((asset) => asset.kind === row.kind)) {
      current.push({ id: row.id, kind: row.kind, storagePath: row.storage_path });
      grouped.set(row.result_id, current);
    }
  }
  return grouped;
}

function parseJson<T>(value: string) {
  return JSON.parse(value) as T;
}
