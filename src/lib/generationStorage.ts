import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ImageKind } from "./asyncJobs";
import { getDatabase, getGenerationAssetDirectory } from "./localDatabase";

export type StoredAsset = {
  id: string;
  kind: ImageKind;
  storagePath: string;
};

export async function uploadJobImage({
  userId,
  jobId,
  kind,
  image,
}: {
  userId: string;
  jobId: string;
  kind: ImageKind;
  image: string;
}) {
  const parsed = await parseImageData(image);
  const extension = extensionForMimeType(parsed.mimeType);
  const relativePath = path.join(
    safePathSegment(userId),
    safePathSegment(jobId),
    `${kind}${extension}`,
  );
  const absolutePath = resolveStoragePath(relativePath);
  const temporaryPath = `${absolutePath}.${Date.now()}.tmp`;
  await mkdir(path.dirname(absolutePath), { recursive: true });

  try {
    await writeFile(temporaryPath, parsed.buffer);
    await rename(temporaryPath, absolutePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }

  return {
    storagePath: relativePath.replaceAll("\\", "/"),
    mimeType: parsed.mimeType,
  };
}

export function createAssetUrls(assets: StoredAsset[]) {
  const urls: {
    completeSceneUrl?: string;
    referenceSheetUrl?: string;
  } = {};

  for (const asset of assets) {
    const url = `/api/assets/${encodeURIComponent(asset.id)}`;
    if (asset.kind === "complete_scene" && !urls.completeSceneUrl) {
      urls.completeSceneUrl = url;
    }
    if (asset.kind === "reference_sheet" && !urls.referenceSheetUrl) {
      urls.referenceSheetUrl = url;
    }
  }

  return urls;
}

export async function readAssetForUser(assetId: string, userId: string) {
  const row = getDatabase().prepare(`
    SELECT storage_path, mime_type
    FROM generation_assets
    WHERE id = ? AND user_id = ?
  `).get(assetId, userId) as { storage_path: string; mime_type: string } | undefined;
  if (!row) return null;

  try {
    return {
      buffer: await readFile(resolveStoragePath(row.storage_path)),
      mimeType: row.mime_type,
    };
  } catch {
    return null;
  }
}

export async function deleteStoredAsset(storagePath: string) {
  await unlink(resolveStoragePath(storagePath)).catch(() => undefined);
}

function resolveStoragePath(relativePath: string) {
  const root = path.resolve(getGenerationAssetDirectory());
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("图片存储路径无效。");
  }
  return resolved;
}

function safePathSegment(value: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error("图片存储标识无效。");
  }
  return value;
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return ".png";
}

async function parseImageData(image: string) {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (match) {
    return {
      mimeType: match[1],
      buffer: Buffer.from(match[2], "base64"),
    };
  }

  if (/^https?:\/\//i.test(image)) {
    const response = await fetch(image);
    if (!response.ok) {
      throw new Error("远程图片下载失败。");
    }

    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      throw new Error("远程资源不是有效图片。");
    }
    return {
      mimeType: contentType,
      buffer: Buffer.from(await response.arrayBuffer()),
    };
  }

  throw new Error("图片格式不支持，请使用 base64 data URL。");
}
