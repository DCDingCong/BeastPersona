import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertSameOrigin,
  AuthInputError,
  loginLocalUser,
  registerLocalUser,
  validateAuthInput,
} from "./localAuth";
import { getDatabase, resetLocalDatabaseForTests } from "./localDatabase";

let dataDirectory: string;

describe("local auth", () => {
  beforeEach(() => {
    dataDirectory = mkdtempSync(path.join(tmpdir(), "beast-persona-auth-"));
    vi.stubEnv("LOCAL_DATA_DIR", dataDirectory);
  });

  afterEach(() => {
    resetLocalDatabaseForTests();
    rmSync(dataDirectory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("registers a user, hashes the password, and grants credits once", async () => {
    const result = await registerLocalUser("user@example.com", "strong-pass-123");
    const row = getDatabase()
      .prepare("SELECT email, password_hash FROM users WHERE id = ?")
      .get(result.user.id) as { email: string; password_hash: string };
    expect(row.email).toBe("user@example.com");
    expect(row.password_hash).not.toContain("strong-pass-123");
    expect(result.token.length).toBeGreaterThan(30);

    await expect(loginLocalUser("user@example.com", "strong-pass-123")).resolves.toMatchObject({
      user: { id: result.user.id, email: "user@example.com" },
    });
  });

  it("rejects duplicate email and invalid credentials without exposing password state", async () => {
    await registerLocalUser("user@example.com", "strong-pass-123");
    await expect(registerLocalUser("USER@example.com", "another-pass-123")).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<AuthInputError>);
    await expect(loginLocalUser("user@example.com", "wrong-pass-123")).rejects.toMatchObject({
      status: 401,
      message: "邮箱或密码不正确。",
    } satisfies Partial<AuthInputError>);
  });

  it("validates normalized email and an eight character password", () => {
    expect(validateAuthInput(" USER@Example.com ", "12345678")).toEqual({
      email: "user@example.com",
      password: "12345678",
    });
    expect(() => validateAuthInput("invalid", "12345678")).toThrow("请输入有效的邮箱地址。");
    expect(() => validateAuthInput("a@example.com", "1234567")).toThrow("8 到 128 位");
  });

  it("rejects cross-origin state-changing requests", () => {
    expect(() => assertSameOrigin(new Request("https://app.example/api/auth/login", {
      headers: { host: "app.example", origin: "https://evil.example" },
    }))).toThrow("请求来源无效。");
  });
});
