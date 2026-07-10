import { NextResponse } from "next/server";
import { getAppMode } from "@/lib/appMode";
import { ensureCreditAccount } from "@/lib/userAccounts";
import { listUserJobs, listUserResults } from "@/lib/generationRepository";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/userSession";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const account = user.anonymous ? null : ensureCreditAccount(user.id);
    const jobs = listUserJobs(user.id);
    const results = listUserResults(user.id);

    return NextResponse.json({
      user,
      mode: getAppMode(),
      credits: account?.credits ?? 0,
      jobs,
      results,
    });
  } catch (error) {
    const isAuthError = error instanceof AuthRequiredError;

    if (!isAuthError) {
      console.error("Failed to load account summary", error);
    }

    return NextResponse.json(
      { error: isAuthError ? error.message : "账户服务暂时不可用，请稍后再试。" },
      { status: isAuthError ? error.status : 500 },
    );
  }
}
