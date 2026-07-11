import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  assertValidDraftRequest: vi.fn(),
  generateCharacterDraft: vi.fn(),
  listRecentCharacterSpecsForUser: vi.fn(),
  scoreAnswers: vi.fn(),
}));

vi.mock("@/lib/userSession", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/userSession")>();
  return { ...original, requireAuthenticatedUser: mocks.requireAuthenticatedUser };
});
vi.mock("@/lib/serverGeneration", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/serverGeneration")>();
  return {
    ...original,
    assertValidDraftRequest: mocks.assertValidDraftRequest,
    generateCharacterDraft: mocks.generateCharacterDraft,
  };
});
vi.mock("@/lib/generationRepository", () => ({
  listRecentCharacterSpecsForUser: mocks.listRecentCharacterSpecsForUser,
}));
vi.mock("@/lib/scoring", () => ({ scoreAnswers: mocks.scoreAnswers }));

import { AuthRequiredError } from "@/lib/userSession";
import { POST } from "./route";

describe("generate spec route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recomputes scoring on the server and supplies only the current user's recent specs", async () => {
    const body = { mode: "quick", lineageMode: "ai", answers: [{ questionId: "q1", optionId: "a" }] };
    const snapshot = { tags: { calm: 1 }, speciesCandidates: [], lineageScores: { pure: 1, hybrid: 0 }, lineageRecommendation: "pure", selectedEffects: { missions: [], palettes: [], roles: [], outfitHints: [], itemHints: [], sceneHints: [], poseHints: [], motifHints: [], mustKeep: [], avoid: [], promptHints: [] } };
    const spec = { primary_species: "狐" };
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-a", email: "a@example.com", anonymous: false });
    mocks.scoreAnswers.mockReturnValue(snapshot);
    mocks.listRecentCharacterSpecsForUser.mockReturnValue([{ primary_species: "狼" }]);
    mocks.generateCharacterDraft.mockResolvedValue(spec);

    const response = await POST(new Request("http://localhost/api/generate/spec", { method: "POST", body: JSON.stringify(body) }));
    expect(response.status).toBe(200);
    expect(mocks.listRecentCharacterSpecsForUser).toHaveBeenCalledWith("user-a", 10);
    expect(mocks.generateCharacterDraft).toHaveBeenCalledWith(
      expect.objectContaining({ ...body, scoreSnapshot: snapshot, confirmedSpec: undefined }),
      [{ primary_species: "狼" }],
    );
    expect(await response.json()).toEqual({ characterSpec: spec, scoreSnapshot: snapshot });
  });

  it("returns 401 without exposing history when authentication fails", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new AuthRequiredError());
    const response = await POST(new Request("http://localhost/api/generate/spec", {
      method: "POST",
      body: JSON.stringify({ mode: "quick", lineageMode: "ai", answers: [] }),
    }));
    expect(response.status).toBe(401);
    expect(mocks.listRecentCharacterSpecsForUser).not.toHaveBeenCalled();
  });
});
