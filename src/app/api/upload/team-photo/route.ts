import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/admin/is-platform-admin";
import { getTeamPhotosBucket, getPublicTeamPhotoUrl } from "@/lib/gcs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function inferExt(name: string): string | null {
  const lower = (name || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  return null;
}

async function saveLocalFallback(
  buffer: Buffer,
  objectName: string,
  contentType: string
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "team");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, objectName);
  await writeFile(filePath, buffer);
  // Touch content type via sidecar is unnecessary for static serving
  void contentType;
  return `/team/${objectName}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isPlatformAdmin(session.user.email))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const memberName = (formData.get("name") as string | null)?.trim() || "member";
    const role = (formData.get("role") as string | null)?.trim() || "";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type] || inferExt(file.name);
    if (!ext) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WebP files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2 MB" },
        { status: 400 }
      );
    }

    const safeMember = memberName.replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 40) || "member";
    const objectName = `${Date.now()}-${safeMember}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType =
      file.type && file.type.startsWith("image/") ? file.type : `image/${ext}`;

    // Prefer GCS when configured; fall back to local public/team for local/dev.
    if (process.env.GCS_BUCKET_TEAM_PHOTOS?.trim()) {
      try {
        const gcsFile = getTeamPhotosBucket().file(objectName);
        await gcsFile.save(buffer, {
          contentType,
          metadata: {
            cacheControl: "public, max-age=31536000",
            ...(memberName && { "x-member-name": memberName }),
            ...(role && { "x-member-role": role }),
          },
        });
        const photoUrl = getPublicTeamPhotoUrl(objectName);
        return NextResponse.json({ photoUrl, objectName, storage: "gcs" });
      } catch (gcsErr) {
        console.error("[upload/team-photo] GCS upload failed, trying local fallback:", gcsErr);
        try {
          const photoUrl = await saveLocalFallback(buffer, objectName, contentType);
          return NextResponse.json({
            photoUrl,
            objectName,
            storage: "local",
            warning: "Saved locally because GCS upload failed.",
          });
        } catch (localErr) {
          console.error("[upload/team-photo] Local fallback failed:", localErr);
          const msg =
            process.env.NODE_ENV === "development" && gcsErr instanceof Error
              ? gcsErr.message
              : "Photo upload failed. Check GCS bucket and credentials.";
          return NextResponse.json({ error: msg }, { status: 503 });
        }
      }
    }

    try {
      const photoUrl = await saveLocalFallback(buffer, objectName, contentType);
      return NextResponse.json({ photoUrl, objectName, storage: "local" });
    } catch (localErr) {
      console.error("[upload/team-photo] Local save failed:", localErr);
      return NextResponse.json(
        {
          error:
            "Team photo storage is not available. Configure GCS_BUCKET_TEAM_PHOTOS or ensure public/team is writable.",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("[upload/team-photo] Error:", error);
    const message =
      process.env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Failed to upload photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
