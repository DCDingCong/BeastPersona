import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDatabase, resetLocalDatabaseForTests } from "./localDatabase";
import {
  ensureCreditAccount,
  getInitialCredits,
  insufficientCreditsMessage,
} from "./userAccounts";

let dataDirectory: string;

describe("user accounts", () => {
  beforeEach(() => {
    dataDirectory = mkdtempSync(path.join(tmpdir(), "beast-persona-account-"));
    vi.stubEnv("LOCAL_DATA_DIR", dataDirectory);
  });

  afterEach(() => {
    resetLocalDatabaseForTests();
    rmSync(dataDirectory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("uses INITIAL_USER_CREDITS when configured", () => {
    vi.stubEnv("INITIAL_USER_CREDITS", "7");
    expect(getInitialCredits()).toBe(7);
  });

  it("grants initial credits only once", () => {
    expect(ensureCreditAccount("user-a")).toMatchObject({ credits: 3, initialCredits: 3 });
    expect(ensureCreditAccount("user-a")).toMatchObject({ credits: 3, initialCredits: 3 });

    const row = getDatabase().prepare(`
      SELECT COUNT(*) AS count FROM credit_transactions
      WHERE user_id = ? AND type = 'initial_grant'
    `).get("user-a") as { count: number };
    expect(Number(row.count)).toBe(1);
  });

  it("keeps a stable insufficient credits message for API clients", () => {
    expect(insufficientCreditsMessage).toBe("积分不足，请充值或稍后领取新额度。");
  });
});
