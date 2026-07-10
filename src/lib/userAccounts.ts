import { randomUUID } from "node:crypto";
import { getDatabase, withImmediateTransaction } from "./localDatabase";

export type CreditAccount = {
  userId: string;
  credits: number;
  initialCredits: number;
  initialCreditsGrantedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type CreditAccountRow = {
  user_id: string;
  credits: number;
  initial_credits: number;
  initial_credits_granted_at: string | null;
  created_at: string;
  updated_at: string;
};

export const defaultInitialCredits = 3;
export const generationCreditCost = 1;
export const insufficientCreditsMessage = "积分不足，请充值或稍后领取新额度。";

export function getInitialCredits() {
  const parsed = Number.parseInt(process.env.INITIAL_USER_CREDITS || "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultInitialCredits;
}

export function ensureCreditAccount(userId: string) {
  return withImmediateTransaction((database) => {
    const existing = database
      .prepare("SELECT * FROM credit_accounts WHERE user_id = ?")
      .get(userId) as CreditAccountRow | undefined;
    if (existing) return mapCreditAccount(existing);

    const initialCredits = getInitialCredits();
    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO credit_accounts (
        user_id, credits, initial_credits, initial_credits_granted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, initialCredits, initialCredits, now, now, now);
    database.prepare(`
      INSERT INTO credit_transactions (id, user_id, amount, type, reason, job_id, created_at)
      VALUES (?, ?, ?, 'initial_grant', ?, NULL, ?)
    `).run(randomUUID(), userId, initialCredits, "首次注册积分", now);

    return mapCreditAccount({
      user_id: userId,
      credits: initialCredits,
      initial_credits: initialCredits,
      initial_credits_granted_at: now,
      created_at: now,
      updated_at: now,
    });
  });
}

export function getCreditAccount(userId: string) {
  const row = getDatabase()
    .prepare("SELECT * FROM credit_accounts WHERE user_id = ?")
    .get(userId) as CreditAccountRow | undefined;
  return row ? mapCreditAccount(row) : null;
}

export function mapCreditAccount(row: CreditAccountRow): CreditAccount {
  return {
    userId: row.user_id,
    credits: row.credits,
    initialCredits: row.initial_credits,
    initialCreditsGrantedAt: row.initial_credits_granted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
