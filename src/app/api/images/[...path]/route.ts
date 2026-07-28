import { NextResponse } from "next/server";
import { getImagesBucket, getTeamPhotosBucket } from "@/lib/gcs";

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB safety cap

function getExt(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * GET /api/images/[...path]
 * Public proxy — streams logos and team photos from GCS without requiring auth.
 * Only serves objects whose path starts with "logos/" or "team/" to prevent
 * this route from becoming a general-purpose GCS proxy.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    if (!path?.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const objectName = path.join("/");

    // Restrict to known safe prefixes
    const ALLOWED_PREFIXES = ["logos/", "team/", "profile-images/"];
    if (!ALLOWED_PREFIXES.some((p) => objectName.startsWith(p))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Block path traversal
    if (objectName.includes("..") || objectName.includes("//")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    let buffer: Buffer;
    let contentType: string;

    try {
      // "team/" is a route discriminator — team photos live at the root of the
      // team bucket (no subfolder). logos/ and profile-images/ use the logos bucket.
      const isTeam = objectName.startsWith("team/");
      const bucket = isTeam ? getTeamPhotosBucket() : getImagesBucket();
      const gcsObjectName = isTeam ? objectName.slice("team/".length) : objectName;
      const gcsFile = bucket.file(gcsObjectName);
      const [metadata] = await gcsFile.getMetadata();
      const rawSize = metadata.size;
      const fileSize = (rawSize !== null && rawSize !== undefined) ? Number(rawSize) : NaN;

      if (isNaN(fileSize)) {
        return NextResponse.json({ error: "Could not read image metadata" }, { status: 502 });
      }
      if (fileSize > MAX_BYTES) {
        return NextResponse.json({ error: "Image too large" }, { status: 413 });
      }

      const [contents] = await gcsFile.download();
      buffer = Buffer.from(contents);

      const ext = getExt(gcsObjectName.split("/").pop() || "");
      const rawContentType = (metadata.contentType as string | undefined) || "";

      // Trusted extension wins; only fall back to metadata content type if no
      // known extension mapping exists — prevents a crafted GCS object from
      // smuggling a non-image metadata type past a recognised image extension.
      if (MIME_MAP[ext]) {
        contentType = MIME_MAP[ext];
      } else if (rawContentType.startsWith("image/")) {
        contentType = rawContentType;
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (err) {
      console.error("[api/images] GCS download failed:", err);
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      // Public, cached for 1 year — logos and team photos rarely change
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };

    if (contentType === "image/svg+xml") {
      responseHeaders["Content-Security-Policy"] = "script-src 'none'";
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[GET /api/images] Error:", error);
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 });
  }
}
