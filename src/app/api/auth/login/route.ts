import { NextResponse } from "next/server";
import { isMultiUserMode } from "@/lib/appMode";
import {
  clearAuthAttempts,
  consumeAuthAttempt,
  getAuthRateLimitKey,
} from "@/lib/authRateLimit";
import {
  assertSameOrigin,
  AuthInputError,
  loginLocalUser,
  setSessionCookie,
  validateAuthInput,
} from "@/lib/localAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isMultiUserMode()) {
    return NextResponse.json({ error: "当前版本未启用账户功能。" }, { status: 404 });
  }

  try {
    assertSameOrigin(request);
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const input = validateAuthInput(body.email, body.password);
    const rateLimitKey = getAuthRateLimitKey(request, input.email);
    const rateLimit = consumeAuthAttempt(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "操作过于频繁，请稍后再试。" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const result = await loginLocalUser(input.email, input.password);
    await setSessionCookie(result.token, request);
    clearAuthAttempts(rateLimitKey);
    return NextResponse.json({ user: result.user });
  } catch (error) {
    if (error instanceof AuthInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Local login failed", error);
    return NextResponse.json({ error: "登录服务暂时不可用，请稍后再试。" }, { status: 500 });
  }
}
