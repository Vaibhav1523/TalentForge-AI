import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { api400, api500 } from '@/lib/apiError';
import { Prisma } from '@prisma/client';
import { recruiterCanAccessJob } from '@/lib/company-scope';

/**
 * GET /api/jobs/[id]/applications
 * View applications for a job - only company that owns the job
 */
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id as string | undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { userRole: true }
        });

        if (dbUser?.userRole !== UserRole.RECRUITER) {
            return NextResponse.json({
                error: "Forbidden - Only companies can view applications"
            }, { status: 403 });
        }

        const job = await prisma.job.findUnique({
            where: { id: params.id },
            select: { id: true, title: true, companyId: true, organizationId: true },
        });

        if (!job || !(await recruiterCanAccessJob(userId, job))) {
            return NextResponse.json({ error: "Forbidden - You can only view applications for your own jobs" }, { status: 403 });
        }

        const PAGE_SIZE = 50;
        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get('cursor') ?? undefined;

        let applications;
        try {
            applications = await prisma.application.findMany({
                where: { jobId: params.id },
                orderBy: { appliedAt: 'desc' },
                take: PAGE_SIZE + 1,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                select: {
                    id: true,
                    candidateId: true,
                    status: true,
                    appliedAt: true,
                    motivation: true,
                    resumeUrl: true,
                    interviewScheduledAt: true,
                    currentCTC: true,
                    expectedCTC: true,
                    noticePeriod: true,
                    city: true,
                }
            });
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
                return api400('Invalid cursor: the specified application does not exist');
            }
            throw err;
        }

        const hasMore = applications.length > PAGE_SIZE;
        const data = applications.slice(0, PAGE_SIZE);
        const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;
        return NextResponse.json({ data, hasMore, nextCursor });
    } catch (error) {
        return api500("Failed to fetch applications", "GET /api/jobs/[id]/applications", error);
    }
}
