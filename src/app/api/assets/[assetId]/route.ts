import { NextResponse } from "next/server";
import { readAssetForUser } from "@/lib/generationStorage";
import { AuthRequiredError, requireAuthenticatedUser } from "@/lib/userSession";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { assetId } = await context.params;
    const asset = await readAssetForUser(assetId, user.id);
    if (!asset) {
      return NextResponse.json({ error: "图片不存在。" }, { status: 404 });
    }

    const requestedFilename = new URL(request.url).searchParams.get("download");
    const headers: Record<string, string> = {
        "Content-Type": asset.mimeType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
    };
    if (requestedFilename) {
      const safeFilename = requestedFilename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/^\.+/, "");
      headers["Content-Disposition"] = `attachment; filename="${safeFilename || "fursona.png"}"`;
    }

    return new NextResponse(new Uint8Array(asset.buffer), {
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AuthRequiredError ? error.message : "图片读取失败。" },
      { status: error instanceof AuthRequiredError ? error.status : 500 },
    );
  }
}
