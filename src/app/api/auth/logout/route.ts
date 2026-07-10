import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  AuthInputError,
  clearSessionCookie,
  deleteCurrentSession,
} from "@/lib/localAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await deleteCurrentSession();
    await clearSessionCookie();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "退出失败，请稍后再试。" }, { status: 500 });
  }
}
