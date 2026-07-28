import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { api500 } from '@/lib/apiError';
import { resolveCompanyAuth } from '@/lib/admin/resolve-company';
import { applicationWhereForCompanyScope } from '@/lib/company-scope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company/applications
 * Fetch ALL applications for the authenticated company
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get("slug")?.trim();

        const auth = await resolveCompanyAuth(slug);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }
        const statusParam = searchParams.get('status');
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10)));
        const skip = (page - 1) * pageSize;

        const jobIdParam = searchParams.get('jobId');

        let whereClause: Prisma.ApplicationWhereInput = {
            ...applicationWhereForCompanyScope(auth),
        };

        if (jobIdParam) {
            if (!/^[a-f\d]{24}$/i.test(jobIdParam)) {
                return NextResponse.json({ data: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } });
            }
            whereClause.jobId = jobIdParam;
        }

        const statusMap: Record<string, ApplicationStatus[]> = {
            'Active': [ApplicationStatus.APPLIED, ApplicationStatus.SHORTLISTED, ApplicationStatus.INTERVIEW],
            'Inactive': [ApplicationStatus.REJECTED, ApplicationStatus.HIRED],
            'Withdrawn': [ApplicationStatus.WITHDRAWN]
        };

        if (statusParam && statusMap[statusParam]) {
            whereClause.status = { in: statusMap[statusParam] };
        }

        if (fromDate || toDate) {
            whereClause.appliedAt = {};
            if (fromDate) {
                const date = new Date(fromDate);
                if (!isNaN(date.getTime())) whereClause.appliedAt.gte = date;
                else return NextResponse.json({ error: "Invalid fromDate format" }, { status: 400 });
            }
            if (toDate) {
                const date = new Date(toDate);
                if (!isNaN(date.getTime())) whereClause.appliedAt.lte = date;
                else return NextResponse.json({ error: "Invalid toDate format" }, { status: 400 });
            }
        }

        type AppWithJob = { candidateId: string; job: { id: string; title: string; category: string; employmentType: string; location: string; companyId: string } | null };
        const [total, applications] = await prisma.$transaction([
            prisma.application.count({ where: whereClause }),
            prisma.application.findMany({
                where: whereClause,
                include: {
                    job: {
                        select: { id: true, title: true, category: true, employmentType: true, location: true, companyId: true }
                    }
                },
                orderBy: { appliedAt: 'desc' },
                skip,
                take: pageSize
            })
        ]);

        // whereClause already filters by companyId; no in-memory re-check needed
        const candidateIds = Array.from(new Set((applications as AppWithJob[]).map((app) => app.candidateId)));

        const candidates = await prisma.user.findMany({
            where: { id: { in: candidateIds } },
            select: { id: true, name: true, email: true, profileImageUrl: true }
        });

        const candidateMap = new Map(candidates.map(c => [c.id, c]));

        const enrichedApplications = (applications as AppWithJob[]).map((app) => {
            const candidate = candidateMap.get(app.candidateId);
            return {
                ...app,
                candidate: candidate || { id: app.candidateId, name: 'Unknown Candidate', email: 'N/A', profileImageUrl: null }
            };
        });

        return NextResponse.json({
            data: enrichedApplications,
            pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
        });
    } catch (error) {
        return api500("Failed to fetch applications", "GET /api/company/applications", error);
    }
}
