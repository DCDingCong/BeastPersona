import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDatabase, withImmediateTransaction } from "./localDatabase";
import { ensureCreditAccount } from "./userAccounts";

const scrypt = promisify(scryptCallback);
const sessionCookieName = "beast_persona_session";
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
};

export class AuthInputError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthInputError";
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateAuthInput(email: unknown, password: unknown) {
  if (typeof email !== "string" || typeof password !== "string") {
    throw new AuthInputError("邮箱和密码不能为空。", 400);
  }

  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw new AuthInputError("请输入有效的邮箱地址。", 400);
  }

  if (password.length < 8 || password.length > 128) {
    throw new AuthInputError("密码长度需要为 8 到 128 位。", 400);
  }

  return { email: normalizedEmail, password };
}

export async function registerLocalUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const existing = getDatabase().prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    throw new AuthInputError("这个邮箱已经注册，请直接登录。", 409);
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  try {
    withImmediateTransaction((database) => {
      database
        .prepare("INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .run(userId, normalizedEmail, passwordHash, now, now);
    });
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) {
      throw new AuthInputError("这个邮箱已经注册，请直接登录。", 409);
    }
    throw error;
  }

  ensureCreditAccount(userId);
  const token = createSession(userId);
  return { user: { id: userId, email: normalizedEmail }, token };
}

export async function loginLocalUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const row = getDatabase()
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(normalizedEmail) as UserRow | undefined;

  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw new AuthInputError("邮箱或密码不正确。", 401);
  }

  const token = createSession(row.id);
  return { user: { id: row.id, email: row.email }, token };
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const now = new Date().toISOString();
  const row = getDatabase()
    .prepare(`
      SELECT users.id, users.email
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `)
    .get(tokenHash, now) as { id: string; email: string } | undefined;

  if (!row) return null;
  return { id: row.id, email: row.email };
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    getDatabase().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
  }
}

export async function setSessionCookie(token: string, request: Request) {
  const cookieStore = await cookies();
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || forwardedProtocol === "https",
    path: "/",
    maxAge: Math.floor(sessionDurationMs / 1000),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const expectedHost = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AuthInputError("请求来源无效。", 403);
  }
  if (originHost !== expectedHost) {
    throw new AuthInputError("请求来源无效。", 403);
  }
}

function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  getDatabase()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(
      hashSessionToken(token),
      userId,
      new Date(now.getTime() + sessionDurationMs).toISOString(),
      now.toISOString(),
    );
  getDatabase().prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now.toISOString());
  return token;
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [algorithm, saltValue, hashValue] = encoded.split(":");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;

  const expected = Buffer.from(hashValue, "base64url");
  const actual = (await scrypt(password, Buffer.from(saltValue, "base64url"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
