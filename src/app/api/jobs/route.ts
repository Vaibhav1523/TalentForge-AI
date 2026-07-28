import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { api500 } from '@/lib/apiError';

/**
 * POST /api/jobs
 * Create a new job posting
 * 🔒 SECURITY: Only companies (RECRUITER) can create jobs
 * 🔒 SECURITY: companyId comes from authenticated session (cannot be spoofed)
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id as string | undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { userRole: true, organizationId: true },
        });

        if (!dbUser || dbUser.userRole !== UserRole.RECRUITER) {
            return NextResponse.json({
                error: "Forbidden - Only companies can post jobs"
            }, { status: 403 });
        }

        const body = await req.json();
        const {
            title,
            company,
            location,
            description,
            employmentType,
            category,
            skills,
            salary,
            currency,
            status,
            country,
            state,
            city,
            pincode,
            workMode,
            experienceMin,
            experienceMax,
            requirements,
        } = body;

        if (!title || !company || !description || !employmentType || !category) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const fullLocation = [city, state, country].filter(Boolean).join(', ') || location || 'Remote';

        const parseOptionalYears = (value: unknown): number | null => {
            if (value == null || value === '') return null;
            const n = parseInt(String(value), 10);
            return Number.isFinite(n) ? n : null;
        };

        const job = await prisma.job.create({
            data: {
                title,
                company,
                location: fullLocation,
                description,
                employmentType,
                category,
                skills: Array.isArray(skills) ? skills : [],
                salary,
                currency,
                companyId: userId,
                organizationId: dbUser.organizationId ?? undefined,
                status: status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT',
                experienceMin: parseOptionalYears(experienceMin),
                experienceMax: parseOptionalYears(experienceMax),
            }
        });

        return NextResponse.json(job, { status: 201 });

    } catch (error) {
        return api500("Failed to create job", "POST /api/jobs", error);
    }
}

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

/**
 * GET /api/jobs
 * List all ACTIVE jobs (public). Supports server-side filtering via query params.
 * - employmentType: comma-separated (e.g. "Full-time,Contract,Internship")
 * - category: single value (e.g. "Engineering")
 * - skills: exact skill tag match via array hasSome (one term)
 * - page: 1-based (default 1)
 * - pageSize: default 12, max 50
 *
 * Response: { jobs: Job[], pagination: { page, pageSize, total, totalPages, hasMore } }
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const employmentTypeParam = searchParams.get('employmentType');
        const categoryParam = searchParams.get('category');
        const skillsParam = searchParams.get('skills');

        const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
        const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
        const rawPageSize = parseInt(
            searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE),
            10,
        );
        const pageSize = Math.min(
            MAX_PAGE_SIZE,
            Math.max(1, Number.isNaN(rawPageSize) ? DEFAULT_PAGE_SIZE : rawPageSize),
        );
        const skip = (page - 1) * pageSize;

        const where: {
            status: 'ACTIVE';
            employmentType?: { in: string[] };
            category?: string;
            skills?: { hasSome: string[] } | { has: string };
        } = { status: 'ACTIVE' };

        if (employmentTypeParam) {
            const types = employmentTypeParam.split(',').map(t => t.trim()).filter(Boolean);
            if (types.length > 0) {
                where.employmentType = { in: types };
            }
        }

        if (categoryParam && categoryParam !== 'All Categories') {
            where.category = categoryParam;
        }

        // Push skills filtering to the database using Prisma's array operators.
        // `hasSome` performs a case-sensitive exact-element match at the DB level,
        // avoiding the previous pattern of fetching 100 rows and filtering in-memory.
        // For case-insensitive substring matching a full-text search index would be ideal,
        // but hasSome covers the common "exact skill tag" use-case efficiently.
        if (skillsParam?.trim()) {
            const term = skillsParam.trim();
            where.skills = { hasSome: [term] };
        }

        const [total, jobs] = await Promise.all([
            prisma.job.count({ where }),
            prisma.job.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
                select: {
                    id: true,
                    title: true,
                    company: true,
                    location: true,
                    description: true,
                    employmentType: true,
                    category: true,
                    skills: true,
                    salary: true,
                    currency: true,
                    status: true,
                    createdAt: true,
                    experienceMin: true,
                    experienceMax: true,
                    companyId: true,
                    organizationId: true,
                },
            }),
        ]);

        // Batch-fetch recruiter company slugs separately to avoid crashing
        // on orphaned companyId references (deleted users).
        const uniqueCompanyIds = Array.from(new Set(jobs.map(j => j.companyId)));
        const recruiterSlugs = uniqueCompanyIds.length
            ? await prisma.user.findMany({
                where: { id: { in: uniqueCompanyIds } },
                select: { id: true, companySlug: true },
            })
            : [];
        const slugMap = new Map(recruiterSlugs.map(u => [u.id, u.companySlug]));

        const orgIds = Array.from(
            new Set(jobs.map((j) => j.organizationId).filter((id): id is string => Boolean(id))),
        );
        const orgRows = orgIds.length
            ? await prisma.organization.findMany({
                  where: { id: { in: orgIds } },
                  select: { id: true, slug: true },
              })
            : [];
        const orgSlugMap = new Map(orgRows.map((o) => [o.id, o.slug]));

        const result = jobs.map(({ companyId, organizationId, ...job }) => ({
            ...job,
            companySlug:
                organizationId && orgSlugMap.has(organizationId)
                    ? orgSlugMap.get(organizationId) ?? null
                    : slugMap.get(companyId) ?? null,
        }));

        const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
        const hasMore = skip + result.length < total;

        return NextResponse.json({
            jobs: result,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
                hasMore,
            },
        });
    } catch (error) {
        return api500("We're having trouble reaching the database. Please try again in a moment.", "GET /api/jobs", error);
    }
}
