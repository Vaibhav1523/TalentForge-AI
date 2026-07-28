import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { api500 } from '@/lib/apiError';
import { resolveCompanyAuth } from '@/lib/admin/resolve-company';
import {
    applicationWhereForCompanyScope,
    jobWhereForCompanyScope,
    publicActiveJobsWhereForOrganization,
    resolvePublicCompanyBySlug,
} from '@/lib/company-scope';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const publicSlug = searchParams.get("slug")?.trim();

        const session = await getServerSession(authOptions);
        const rawUserId = session?.user?.id as string | undefined;

        // Public access by slug — return limited stats only
        if (publicSlug && !rawUserId) {
            const resolved = await resolvePublicCompanyBySlug(publicSlug);
            if (!resolved) {
                return NextResponse.json({ stats: { activeJobs: 0, totalCandidates: 0, totalApplications: 0, interviews: 0 }, recentActivity: [] });
            }
            const jobWhere =
                resolved.kind === "organization"
                    ? publicActiveJobsWhereForOrganization(resolved.organizationId)
                    : { companyId: resolved.userId, status: "ACTIVE" as const };
            const activeJobs = await prisma.job.count({ where: jobWhere });
            return NextResponse.json({
                stats: { activeJobs, totalCandidates: 0, totalApplications: 0, interviews: 0 },
                recentActivity: [],
            });
        }

        const auth = await resolveCompanyAuth(publicSlug);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const jobScope = jobWhereForCompanyScope(auth);
        const appScope = applicationWhereForCompanyScope(auth);

        const [jobs, applicationsForActivity, totalApplications, uniqueCandidatesCount, interviewCount] = await Promise.all([
            prisma.job.findMany({
                where: jobScope,
                select: { status: true }
            }),
            prisma.application.findMany({
                where: appScope,
                include: {
                    job: { select: { title: true } }
                },
                orderBy: { appliedAt: 'desc' },
                take: 50
            }),
            prisma.application.count({ where: appScope }),
            prisma.application.groupBy({
                by: ['candidateId'],
                where: appScope
            }).then(g => g.length),
            prisma.application.count({
                where: { ...appScope, status: 'INTERVIEW' }
            })
        ]);

        const candidateIds = Array.from(new Set(applicationsForActivity.map(a => a.candidateId)));
        const candidates = await prisma.user.findMany({
            where: { id: { in: candidateIds } },
            select: { id: true, name: true }
        });

        const candidateMap = new Map(candidates.map(c => [c.id, c]));

        const activeJobs = jobs.filter(j => j.status === 'ACTIVE').length;

        const recentActivity = applicationsForActivity.slice(0, 5).map(app => {
            const candidate = candidateMap.get(app.candidateId);
            return {
                id: app.id,
                type: 'APPLICATION',
                user: candidate?.name || 'A candidate',
                role: app.job?.title || 'a job',
                time: app.appliedAt.toISOString()
            };
        });

        return NextResponse.json({
            stats: {
                activeJobs,
                totalCandidates: uniqueCandidatesCount,
                totalApplications,
                interviews: interviewCount
            },
            recentActivity
        });
    } catch (error) {
        return api500("Failed to fetch dashboard stats", "GET /api/company/dashboard-stats", error);
    }
}
