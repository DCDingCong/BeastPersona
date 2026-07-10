import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimNextGenerationJob,
  createQueuedGenerationJob,
  getGenerationQueuePosition,
} from "./asyncJobs";
import { failGenerationJob, getGenerationJobForUser } from "./generationRepository";
import { getDatabase, resetLocalDatabaseForTests } from "./localDatabase";
import { ensureCreditAccount, insufficientCreditsMessage } from "./userAccounts";

let dataDirectory: string;

describe("async jobs", () => {
  beforeEach(() => {
    dataDirectory = mkdtempSync(path.join(tmpdir(), "beast-persona-job-"));
    vi.stubEnv("LOCAL_DATA_DIR", dataDirectory);
    vi.stubEnv("INITIAL_USER_CREDITS", "1");
  });

  afterEach(() => {
    resetLocalDatabaseForTests();
    rmSync(dataDirectory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("deducts credit and creates a queued job atomically", () => {
    ensureCreditAccount("user-a");
    const job = createQueuedGenerationJob({
      userId: "user-a",
      kind: "generate",
      cost: 1,
      input: { mode: "quick" },
    });

    expect(job).toMatchObject({ status: "queued", credits: 0 });
    expect(getGenerationJobForUser("user-a", job.jobId)?.status).toBe("queued");
    expect(() => createQueuedGenerationJob({
      userId: "user-a",
      kind: "generate",
      cost: 1,
      input: { mode: "quick" },
    })).toThrow(insufficientCreditsMessage);
  });

  it("claims jobs in queue order using a lease", () => {
    const first = createQueuedGenerationJob({
      userId: "local-workspace", kind: "generate", cost: 0, input: { mode: "quick" },
    });
    const second = createQueuedGenerationJob({
      userId: "local-workspace", kind: "generate", cost: 0, input: { mode: "quick" },
    });

    expect(getGenerationQueuePosition(first.jobId)).toBe(1);
    expect(getGenerationQueuePosition(second.jobId)).toBe(2);
    expect(claimNextGenerationJob()).toMatchObject({ id: first.jobId, status: "running" });
    expect(getGenerationQueuePosition(second.jobId)).toBe(1);
  });

  it("refunds a failed paid job only once", () => {
    ensureCreditAccount("user-a");
    const job = createQueuedGenerationJob({
      userId: "user-a", kind: "generate", cost: 1, input: { mode: "quick" },
    });
    claimNextGenerationJob();
    failGenerationJob(job.jobId, "test failure");
    failGenerationJob(job.jobId, "duplicate failure");

    const account = getDatabase()
      .prepare("SELECT credits FROM credit_accounts WHERE user_id = ?")
      .get("user-a") as { credits: number };
    const refunds = getDatabase().prepare(`
      SELECT COUNT(*) AS count FROM credit_transactions
      WHERE job_id = ? AND type = 'generation_refund'
    `).get(job.jobId) as { count: number };
    expect(account.credits).toBe(1);
    expect(Number(refunds.count)).toBe(1);
  });

  it("does not expose jobs to another user", () => {
    const job = createQueuedGenerationJob({
      userId: "user-a", kind: "generate", cost: 0, input: { mode: "quick" },
    });
    expect(getGenerationJobForUser("user-b", job.jobId)).toBeNull();
  });
});
