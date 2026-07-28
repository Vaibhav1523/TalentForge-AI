import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getImagesBucket, getPublicImageUrl } from "@/lib/gcs";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

const EXT_TO_MIME: Record<string, string> = {
  "jpg":  "image/jpeg",
  "jpeg": "image/jpeg",
  "png":  "image/png",
  "webp": "image/webp",
};

function inferExt(name: string): string | null {
  const lower = (name || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  if (lower.endsWith(".png"))  return "png";
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
        { error: "Profile image uploads require GCS_BUCKET_IMAGES to be configured." },
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
        { error: "File too large. Maximum size is 2 MB" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Capture previous image object name before overwriting
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileImageUrl: true },
    });
    const previousImageUrl = existingUser?.profileImageUrl ?? null;

    const objectName = `profile-images/${userId}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const contentType = (file.type && ALLOWED_TYPES[file.type]) ? file.type : (EXT_TO_MIME[ext] ?? `image/${ext}`);
      await getImagesBucket().file(objectName).save(buffer, {
        contentType,
        metadata: { cacheControl: "public, max-age=31536000" },
      });
    } catch (gcsErr) {
      console.error("[upload/profile-image] GCS upload failed:", gcsErr);
      const msg =
        process.env.NODE_ENV === "development" && gcsErr instanceof Error
          ? gcsErr.message
          : "Profile image upload failed. Check GCS bucket and credentials.";
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    const profileImageUrl = getPublicImageUrl(objectName);

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { profileImageUrl },
      });
    } catch (dbErr) {
      // DB write failed — remove orphaned GCS file
      getImagesBucket().file(objectName).delete({ ignoreNotFound: true }).catch(() => {});
      if (
        dbErr instanceof Prisma.PrismaClientKnownRequestError &&
        dbErr.code === "P2025"
      ) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      throw dbErr;
    }

    // Delete the previous profile image from GCS (non-blocking; ignore errors)
    if (previousImageUrl && previousImageUrl.startsWith('/api/images/profile-images/')) {
      const oldObjectName = decodeURIComponent(previousImageUrl.slice('/api/images/'.length));
      getImagesBucket().file(oldObjectName).delete({ ignoreNotFound: true }).catch(() => {});
    }

    return NextResponse.json({ profileImageUrl });
  } catch (error) {
    console.error("[upload/profile-image] Error:", error);
    const message =
      process.env.NODE_ENV === "development"
        ? error instanceof Error ? error.message : String(error)
        : "Failed to upload profile image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
