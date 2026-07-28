import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getImagesBucket, getPublicImageUrl } from "@/lib/gcs";
import prisma from "@/lib/prisma";

const MAX_SIZE_BYTES = 800 * 1024; // 800 KB — matches the UI hint
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GCS_BUCKET_IMAGES) {
      return NextResponse.json(
        { error: "Image uploads require GCS_BUCKET_IMAGES to be configured." },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
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
        { error: "File too large. Maximum size is 800 KB" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const rawSafeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || `logo.${ext}`;
    const baseName = rawSafeName.replace(/\.(jpe?g|jpg|png|gif|webp|svg)$/i, "") || "logo";
    const safeName = `${baseName}.${ext}`;
    const objectName = `logos/${userId}-${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Fetch current logo URL before uploading so we can delete the old file on success
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyLogoUrl: true },
    });
    const oldLogoUrl = existingUser?.companyLogoUrl ?? null;

    try {
      const gcsFile = getImagesBucket().file(objectName);
      await gcsFile.save(buffer, {
        contentType: file.type || `image/${ext}`,
        metadata: { cacheControl: "public, max-age=31536000" },
      });
    } catch (gcsErr) {
      console.error("[upload/company-logo] GCS upload failed:", gcsErr);
      const msg =
        process.env.NODE_ENV === "development" && gcsErr instanceof Error
          ? gcsErr.message
          : "Logo upload failed. Check GCS bucket and credentials.";
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    const logoUrl = getPublicImageUrl(objectName);

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { companyLogoUrl: logoUrl },
      });
    } catch (dbErr) {
      // DB write failed — clean up the orphaned GCS file to keep storage consistent
      getImagesBucket().file(objectName).delete({ ignoreNotFound: true }).catch(() => {});
      throw dbErr;
    }

    // Delete the previous logo from GCS now that the DB update succeeded
    if (oldLogoUrl && oldLogoUrl !== logoUrl) {
      try {
        const oldObjectName = oldLogoUrl.includes("/api/images/")
          ? oldLogoUrl.split("/api/images/")[1]
          : null;
        if (oldObjectName) {
          getImagesBucket().file(oldObjectName).delete({ ignoreNotFound: true }).catch(() => {});
        }
      } catch {
        // Non-critical — orphaned file is acceptable over blocking the response
      }
    }

    return NextResponse.json({ logoUrl, objectName });
  } catch (error) {
    console.error("[upload/company-logo] Error:", error);
    const message =
      process.env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Failed to upload logo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
