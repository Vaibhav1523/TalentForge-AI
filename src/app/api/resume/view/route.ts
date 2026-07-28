import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getResumesBucket, getPublicResumeUrl, parseResumeObjectNameFromUrl } from '@/lib/gcs';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MIME_MAP: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function getExt(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * GET /api/resume/view?url=<encoded-gcs-url>&download=1
 * Streams a CV/resume from GCS via the server's credentials (bucket stays private).
 * PDF opens inline; DOC/DOCX force-downloads. Add &download=1 to force-download any type.
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const resumeUrl = searchParams.get('url');
        const forceDownload = searchParams.get('download') === '1';

        if (!resumeUrl) {
            return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
        }

        // parseResumeObjectNameFromUrl validates the bucket name exactly (or bare objectName prefix).
        const objectName = parseResumeObjectNameFromUrl(resumeUrl);
        if (!objectName) {
            return NextResponse.json({ error: 'Invalid resume URL' }, { status: 403 });
        }

        // Legitimacy check: the objectName must be tracked in the DB as a real user's resume or
        // as a resume attached to an application. We match:
        //   1. bare objectName  — new uploads stored by /api/upload/resume
        //   2. public GCS URL   — legacy full https://storage.googleapis.com/... format
        //   3. original param   — covers the corrupted "https://resumes/..." format that was
        //                         mistakenly stored when the apply page prepended https:// to the
        //                         bare object name; parseResumeObjectNameFromUrl already validated
        //                         this points to our bucket, so including it here is safe.
        const publicUrl = getPublicResumeUrl(objectName);
        const uniqueUrls = Array.from(new Set([objectName, publicUrl, resumeUrl]));
        const orClause = uniqueUrls.map(url => ({ resumeUrl: url }));
        const [resumeOwner, resumeApplication] = await Promise.all([
            prisma.user.findFirst({ where: { OR: orClause }, select: { id: true } }),
            prisma.application.findFirst({ where: { OR: orClause }, select: { id: true } }),
        ]);
        if (!resumeOwner && !resumeApplication) {
            return NextResponse.json({ error: 'Unauthorized access to resume' }, { status: 403 });
        }

        let buffer: Buffer;
        try {
            const gcsFile = getResumesBucket().file(objectName);

            // Check size via metadata before downloading to avoid loading oversized files into memory.
            const [metadata] = await gcsFile.getMetadata();
            const fileSize =
                metadata.size !== undefined && metadata.size !== null
                    ? Number(metadata.size)
                    : null;
            if (fileSize === null || isNaN(fileSize)) {
                return NextResponse.json(
                    { error: 'Could not determine resume file size' },
                    { status: 502 }
                );
            }
            if (fileSize > MAX_FILE_BYTES) {
                return NextResponse.json({ error: 'Resume file too large' }, { status: 413 });
            }

            const [contents] = await gcsFile.download();
            buffer = Buffer.from(contents);
            if (buffer.length > MAX_FILE_BYTES) {
                return NextResponse.json({ error: 'Resume file too large' }, { status: 413 });
            }
        } catch (err) {
            console.error('[resume/view] GCS download failed:', err);
            return NextResponse.json(
                { error: 'Could not load resume from storage. Please re-upload your resume.' },
                { status: 404 }
            );
        }

        const rawSegment = resumeUrl.split('/').pop() || 'resume.pdf';
        let filename: string;
        try {
            filename = decodeURIComponent(rawSegment.split('?')[0]);
        } catch {
            filename = rawSegment;
        }

        const ext = getExt(filename);
        const mimeType = MIME_MAP[ext] || 'application/octet-stream';
        const isPdf = ext === 'pdf';
        const disposition =
            forceDownload || !isPdf
                ? `attachment; filename="${encodeURIComponent(filename)}"`
                : `inline; filename="${encodeURIComponent(filename)}"`;

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': disposition,
                'Content-Length': String(buffer.length),
                'Cache-Control': 'private, max-age=300',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        console.error('[GET /api/resume/view] Error:', error);
        return NextResponse.json({ error: 'Failed to serve resume' }, { status: 500 });
    }
}
