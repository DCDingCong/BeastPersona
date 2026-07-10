import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const databaseGlobal = globalThis as typeof globalThis & {
  __beastPersonaDatabase?: DatabaseSync;
};

export function getLocalDataDirectory() {
  return process.env.LOCAL_DATA_DIR
    ? path.resolve(/* turbopackIgnore: true */ process.env.LOCAL_DATA_DIR)
    : path.join(/* turbopackIgnore: true */ process.cwd(), "data");
}

export function getGenerationAssetDirectory() {
  return path.join(getLocalDataDirectory(), "generation-results");
}

export function getDatabase() {
  if (databaseGlobal.__beastPersonaDatabase) {
    return databaseGlobal.__beastPersonaDatabase;
  }

  const dataDirectory = getLocalDataDirectory();
  mkdirSync(dataDirectory, { recursive: true });
  mkdirSync(getGenerationAssetDirectory(), { recursive: true });

  const database = new DatabaseSync(path.join(dataDirectory, "beast-persona.sqlite"));
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA busy_timeout = 5000");
  database.exec(schema);

  databaseGlobal.__beastPersonaDatabase = database;
  return database;
}

export function withImmediateTransaction<T>(operation: (database: DatabaseSync) => T) {
  const database = getDatabase();
  database.exec("BEGIN IMMEDIATE");

  try {
    const result = operation(database);
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function resetLocalDatabaseForTests() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Database reset is only available in tests.");
  }

  const database = databaseGlobal.__beastPersonaDatabase;
  if (database) {
    database.close();
    delete databaseGlobal.__beastPersonaDatabase;
  }
}

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS credit_accounts (
    user_id TEXT PRIMARY KEY,
    credits INTEGER NOT NULL CHECK (credits >= 0),
    initial_credits INTEGER NOT NULL CHECK (initial_credits >= 0),
    initial_credits_granted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('initial_grant', 'generation_reserve', 'generation_refund')),
    reason TEXT NOT NULL,
    job_id TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS credit_transactions_user_created_idx
    ON credit_transactions(user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('generate', 'regenerate-image')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    cost INTEGER NOT NULL CHECK (cost >= 0),
    input_json TEXT NOT NULL,
    result_id TEXT,
    image_kind TEXT CHECK (image_kind IN ('complete_scene', 'reference_sheet')),
    source_result_id TEXT,
    error TEXT,
    lease_until TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
  );
  CREATE INDEX IF NOT EXISTS generation_jobs_user_created_idx
    ON generation_jobs(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS generation_jobs_status_created_idx
    ON generation_jobs(status, created_at ASC);

  CREATE TABLE IF NOT EXISTS generation_results (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL UNIQUE,
    character_spec_json TEXT NOT NULL,
    setting_description TEXT NOT NULL,
    prompts_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS generation_results_user_created_idx
    ON generation_results(user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS generation_assets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    result_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('complete_scene', 'reference_sheet')),
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS generation_assets_result_kind_created_idx
    ON generation_assets(result_id, kind, created_at DESC);
  CREATE INDEX IF NOT EXISTS generation_assets_job_created_idx
    ON generation_assets(job_id, created_at DESC);
`;
