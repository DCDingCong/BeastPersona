type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, RateLimitEntry>();
const authLimit = 8;
const authWindowMs = 15 * 60 * 1000;

export function consumeAuthAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + authWindowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= authLimit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearAuthAttempts(key: string) {
  attempts.delete(key);
}

export function getAuthRateLimitKey(request: Request, email: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${ip}:${email}`;
}
