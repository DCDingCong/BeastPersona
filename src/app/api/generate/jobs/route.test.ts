import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  createQueuedGenerationJob: vi.fn(),
  kickGenerationWorker: vi.fn(),
  ensureCreditAccount: vi.fn(),
}));

vi.mock("@/lib/userSession", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/userSession")>();
  return { ...original, requireAuthenticatedUser: mocks.requireAuthenticatedUser };
});

vi.mock("@/lib/asyncJobs", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/asyncJobs")>();
  return { ...original, createQueuedGenerationJob: mocks.createQueuedGenerationJob };
});

vi.mock("@/lib/generationWorker", () => ({
  kickGenerationWorker: mocks.kickGenerationWorker,
}));

vi.mock("@/lib/userAccounts", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/userAccounts")>();
  return { ...original, ensureCreditAccount: mocks.ensureCreditAccount };
});

import { AuthRequiredError } from "@/lib/userSession";
import { POST } from "./route";

const validBody = {
  mode: "quick",
  lineageMode: "ai",
  answers: [],
  aiSettings: { apiKey: "test-key" },
};

describe("generate jobs route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not logged in", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new AuthRequiredError());
    const response = await POST(new Request("http://localhost/api/generate/jobs", {
      method: "POST",
      body: JSON.stringify(validBody),
    }));
    expect(response.status).toBe(401);
    expect(mocks.createQueuedGenerationJob).not.toHaveBeenCalled();
  });

  it("creates a paid queued job for an authenticated user", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      id: "user-a", email: "a@example.com", anonymous: false,
    });
    mocks.createQueuedGenerationJob.mockReturnValue({
      jobId: "job-a", status: "queued", credits: 2,
    });

    const response = await POST(new Request("http://localhost/api/generate/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody),
    }));
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ jobId: "job-a", credits: 2 });
    expect(mocks.createQueuedGenerationJob).toHaveBeenCalledWith({
      userId: "user-a", kind: "generate", cost: 1, input: validBody,
    });
    expect(mocks.kickGenerationWorker).toHaveBeenCalledOnce();
  });

  it("creates a zero-cost job in anonymous mode", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      id: "local-workspace", email: null, anonymous: true,
    });
    mocks.createQueuedGenerationJob.mockReturnValue({
      jobId: "job-a", status: "queued", credits: 0,
    });
    const response = await POST(new Request("http://localhost/api/generate/jobs", {
      method: "POST",
      body: JSON.stringify(validBody),
    }));
    expect(response.status).toBe(202);
    expect(mocks.ensureCreditAccount).not.toHaveBeenCalled();
    expect(mocks.createQueuedGenerationJob).toHaveBeenCalledWith(expect.objectContaining({ cost: 0 }));
  });
});
