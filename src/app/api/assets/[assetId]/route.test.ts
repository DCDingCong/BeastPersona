import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  readAssetForUser: vi.fn(),
}));

vi.mock("@/lib/userSession", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/userSession")>();
  return { ...original, requireAuthenticatedUser: mocks.requireAuthenticatedUser };
});

vi.mock("@/lib/generationStorage", () => ({
  readAssetForUser: mocks.readAssetForUser,
}));

import { GET } from "./route";

describe("asset route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-a" });
    mocks.readAssetForUser.mockResolvedValue({
      buffer: Buffer.from("image"),
      mimeType: "image/png",
    });
  });

  it("serves an attachment when a browser download filename is requested", async () => {
    const response = await GET(
      new Request("http://localhost/api/assets/asset-a?download=fursona-reference.png"),
      { params: Promise.resolve({ assetId: "asset-a" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition"))
      .toBe('attachment; filename="fursona-reference.png"');
  });

  it("sanitizes attachment filenames", async () => {
    const response = await GET(
      new Request("http://localhost/api/assets/asset-a?download=../bad name.png"),
      { params: Promise.resolve({ assetId: "asset-a" }) },
    );

    expect(response.headers.get("content-disposition"))
      .toBe('attachment; filename="_bad_name.png"');
  });
});
