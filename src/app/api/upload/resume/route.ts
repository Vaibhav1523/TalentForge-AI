import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getResumesBucket } from '@/lib/gcs';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/** Infer extension from filename when file.type is empty (e.g. some PDFs in Safari). */
function inferExt(name: string): string | null {
    const lower = (name || '').toLowerCase();
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.doc')) return 'doc';
    if (lower.endsWith('.docx')) return 'docx';
    return null;
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const bucketName = process.env.GCS_BUCKET_RESUMES;
        if (!bucketName) {
            return NextResponse.json(
                { error: 'Resume upload requires GCS_BUCKET_RESUMES to be set.' },
                { status: 503 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof File)) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const ext = ALLOWED_TYPES[file.type] || inferExt(file.name);
        if (!ext) {
            return NextResponse.json(
                { error: 'Only PDF, DOC, and DOCX files are allowed' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB` },
                { status: 400 }
            );
        }

        const safeName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .slice(0, 80) || `resume.${ext}`;
        const timestamp = Date.now();
        const filename = `${userId}-${timestamp}-${safeName}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to Google Cloud Storage only
        let resumeUrl: string;
        try {
            const bucket = getResumesBucket();
            const objectName = `resumes/${filename}`;
            const gcsFile = bucket.file(objectName);
            const mime = file.type || (ext === 'pdf' ? 'application/pdf' : ext === 'doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            await gcsFile.save(buffer, {
                contentType: mime,
                metadata: { cacheControl: 'private, max-age=31536000' },
            });
            // Persist the bare objectName so /api/resume/view can serve it via ADC
            // without ever exposing an unauthenticated storage.googleapis.com URL.
            resumeUrl = objectName;
        } catch (gcsErr) {
            console.error('[upload/resume] GCS upload failed:', gcsErr);
            const msg = process.env.NODE_ENV === 'development' && gcsErr instanceof Error ? (gcsErr as Error).message : 'Resume upload failed. Check GCS bucket and credentials.';
            return NextResponse.json({ error: msg }, { status: 503 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { resumeUrl },
        });

        return NextResponse.json({ resumeUrl });
    } catch (error) {
        console.error('[upload/resume] Error:', error);
        const message = process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : 'Failed to upload resume';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
