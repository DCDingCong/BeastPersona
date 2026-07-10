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
  registerLocalUser,
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

    const result = await registerLocalUser(input.email, input.password);
    await setSessionCookie(result.token, request);
    clearAuthAttempts(rateLimitKey);
    return NextResponse.json({ user: result.user }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Local signup failed", error);
    return NextResponse.json({ error: "注册服务暂时不可用，请稍后再试。" }, { status: 500 });
  }
}
