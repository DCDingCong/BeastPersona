import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  ensureCreditAccount: vi.fn(),
  listUserJobs: vi.fn(),
  listUserResults: vi.fn(),
  getAppMode: vi.fn(),
}));

vi.mock("@/lib/userSession", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/userSession")>();
  return { ...original, requireAuthenticatedUser: mocks.requireAuthenticatedUser };
});

vi.mock("@/lib/userAccounts", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/userAccounts")>();
  return { ...original, ensureCreditAccount: mocks.ensureCreditAccount };
});

vi.mock("@/lib/generationRepository", () => ({
  listUserJobs: mocks.listUserJobs,
  listUserResults: mocks.listUserResults,
}));

vi.mock("@/lib/appMode", () => ({ getAppMode: mocks.getAppMode }));

import { AuthRequiredError } from "@/lib/userSession";
import { GET } from "./route";

describe("me route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppMode.mockReturnValue("multi-user");
    mocks.listUserJobs.mockReturnValue([]);
    mocks.listUserResults.mockReturnValue([]);
  });

  it("returns 401 when multi-user mode has no session", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new AuthRequiredError());
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "请先登录后再生成。" });
  });

  it("returns the current user's credits, jobs, and results", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      id: "user-a", email: "a@example.com", anonymous: false,
    });
    mocks.ensureCreditAccount.mockReturnValue({ credits: 3, initialCredits: 3 });
    mocks.listUserJobs.mockReturnValue([{ id: "job-a", status: "queued" }]);
    mocks.listUserResults.mockReturnValue([{ id: "result-a", title: "狼设定" }]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: { id: "user-a", email: "a@example.com", anonymous: false },
      mode: "multi-user",
      credits: 3,
      jobs: [{ id: "job-a", status: "queued" }],
      results: [{ id: "result-a", title: "狼设定" }],
    });
  });

  it("returns local history without creating a credit account in anonymous mode", async () => {
    mocks.getAppMode.mockReturnValue("anonymous");
    mocks.requireAuthenticatedUser.mockResolvedValue({
      id: "local-workspace", email: null, anonymous: true,
    });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mode: "anonymous", credits: 0 });
    expect(mocks.ensureCreditAccount).not.toHaveBeenCalled();
  });
});
