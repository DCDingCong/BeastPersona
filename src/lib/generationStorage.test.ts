import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGenerationAsset } from "./generationRepository";
import { createAssetUrls, readAssetForUser, uploadJobImage } from "./generationStorage";
import { getGenerationAssetDirectory, resetLocalDatabaseForTests } from "./localDatabase";

let dataDirectory: string;

describe("generation storage", () => {
  beforeEach(() => {
    dataDirectory = mkdtempSync(path.join(tmpdir(), "beast-persona-storage-"));
    vi.stubEnv("LOCAL_DATA_DIR", dataDirectory);
  });

  afterEach(() => {
    resetLocalDatabaseForTests();
    rmSync(dataDirectory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("writes data URL images to a user/job scoped private path", async () => {
    const result = await uploadJobImage({
      userId: "user-a",
      jobId: "job-a",
      kind: "complete_scene",
      image: "data:image/png;base64,aGVsbG8=",
    });

    expect(result).toEqual({
      storagePath: "user-a/job-a/complete_scene.png",
      mimeType: "image/png",
    });
    expect(existsSync(path.join(getGenerationAssetDirectory(), result.storagePath))).toBe(true);
  });

  it("returns authenticated asset API URLs keyed by image kind", () => {
    expect(createAssetUrls([
      { id: "asset-a", kind: "complete_scene", storagePath: "unused" },
      { id: "asset-b", kind: "reference_sheet", storagePath: "unused" },
    ])).toEqual({
      completeSceneUrl: "/api/assets/asset-a",
      referenceSheetUrl: "/api/assets/asset-b",
    });
  });

  it("reads an asset only for its owner", async () => {
    const uploaded = await uploadJobImage({
      userId: "user-a",
      jobId: "job-a",
      kind: "complete_scene",
      image: "data:image/png;base64,aGVsbG8=",
    });
    const assetId = createGenerationAsset({
      userId: "user-a",
      resultId: "result-a",
      jobId: "job-a",
      kind: "complete_scene",
      storagePath: uploaded.storagePath,
      mimeType: uploaded.mimeType,
    });

    await expect(readAssetForUser(assetId, "user-a")).resolves.toMatchObject({
      mimeType: "image/png",
    });
    await expect(readAssetForUser(assetId, "user-b")).resolves.toBeNull();
  });
});
