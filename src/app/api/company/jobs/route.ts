import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { api500 } from '@/lib/apiError';
import { resolveCompanyAuth } from '@/lib/admin/resolve-company';
import {
    jobWhereForCompanyScope,
    publicActiveJobsWhereForOrganization,
    resolvePublicCompanyBySlug,
} from '@/lib/company-scope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company/jobs
 * List jobs for the authenticated company, or for a public company slug (?slug=xxx).
 * Public access returns only ACTIVE jobs without applicant counts.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const publicSlug = searchParams.get("slug")?.trim();

        const session = await getServerSession(authOptions);
        const rawUserId = session?.user?.id as string | undefined;

        if (!publicSlug && !rawUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Public access by slug — return active jobs only
        if (publicSlug && !rawUserId) {
            const resolved = await resolvePublicCompanyBySlug(publicSlug);
            if (!resolved) {
                return NextResponse.json([], { status: 200 });
            }

            const jobWhere =
                resolved.kind === "organization"
                    ? publicActiveJobsWhereForOrganization(resolved.organizationId)
                    : { companyId: resolved.userId, status: "ACTIVE" as const };

            const jobs = await prisma.job.findMany({
                where: jobWhere,
                orderBy: { createdAt: "desc" },
                take: 50,
            });

            return NextResponse.json(
                jobs.map((job) => ({
                    id: job.id,
                    title: job.title,
                    location: job.location,
                    type: job.employmentType,
                    applicants: 0,
                    status: job.status,
                    postedDate: job.createdAt,
                }))
            );
        }

        const auth = await resolveCompanyAuth(publicSlug);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const jobs = await prisma.job.findMany({
            where: jobWhereForCompanyScope(auth),
            include: { _count: { select: { applications: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const formattedJobs = jobs.map(job => ({
            id: job.id,
            title: job.title,
            location: job.location,
            type: job.employmentType,
            applicants: job._count.applications,
            status: job.status,
            postedDate: job.createdAt
        }));

        return NextResponse.json(formattedJobs);
    } catch (error) {
        return api500("Failed to fetch jobs", "GET /api/company/jobs", error);
    }
}
