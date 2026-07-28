import type { Prisma } from "@prisma/client";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

/** Successful output from resolveCompanyAuth (see resolve-company.ts). */
export type CompanyAccessScope = {
    sessionUserId: string;
    isSuperAdmin: boolean;
    /** When set, jobs/applications are scoped to this organization. */
    organizationId: string | null;
    /**
     * Solo recruiter (no org) or fallback user id for legacy rows.
     * Used when organizationId is null to match job.companyId / application.companyId.
     */
    legacyCompanyUserId: string;
};

/**
 * Jobs belonging to an org: `organizationId` on the job, or poster (`companyUser`) in the org
 * (covers rows created before `Job.organizationId` was backfilled).
 */
export function jobWhereForCompanyScope(scope: CompanyAccessScope): Prisma.JobWhereInput {
    if (scope.organizationId) {
        return {
            OR: [
                { organizationId: scope.organizationId },
                { companyUser: { organizationId: scope.organizationId } },
            ],
        };
    }
    return { companyId: scope.legacyCompanyUserId };
}

/** Public ACTIVE jobs for a company slug resolved to an organization. */
export function publicActiveJobsWhereForOrganization(organizationId: string): Prisma.JobWhereInput {
    return {
        status: "ACTIVE",
        OR: [
            { organizationId },
            { companyUser: { organizationId } },
        ],
    };
}

/** Scope + job id (for single-job API routes). */
export function jobByIdWhereForCompanyScope(
    scope: CompanyAccessScope,
    jobId: string,
): Prisma.JobWhereInput {
    return { id: jobId, ...jobWhereForCompanyScope(scope) };
}

export function applicationWhereForCompanyScope(scope: CompanyAccessScope): Prisma.ApplicationWhereInput {
    if (scope.organizationId) {
        return {
            OR: [
                { organizationId: scope.organizationId },
                {
                    job: {
                        OR: [
                            { organizationId: scope.organizationId },
                            { companyUser: { organizationId: scope.organizationId } },
                        ],
                    },
                },
            ],
        };
    }
    return { companyId: scope.legacyCompanyUserId };
}

/** Recruiter can manage this job (same org or legacy owner / poster). */
export async function recruiterCanAccessJob(userId: string, job: { organizationId: string | null; companyId: string }) {
    const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true, userRole: true },
    });
    if (u?.userRole !== "RECRUITER") return false;

    if (job.organizationId) {
        return u.organizationId === job.organizationId;
    }

    if (u.organizationId) {
        const poster = await prisma.user.findUnique({
            where: { id: job.companyId },
            select: { organizationId: true },
        });
        if (poster?.organizationId === u.organizationId) {
            return true;
        }
    }

    return job.companyId === userId;
}

/** Recruiter can manage this application (same rules as access to its job). */
export async function recruiterCanAccessApplication(
    userId: string,
    application: { companyId: string; organizationId: string | null; jobId: string },
) {
    const job = await prisma.job.findUnique({
        where: { id: application.jobId },
        select: { organizationId: true, companyId: true },
    });
    if (!job) return false;
    return recruiterCanAccessJob(userId, job);
}

/** Resolve public company slug to org id or legacy recruiter user id (for public job lists). */
export async function resolvePublicCompanyBySlug(slug: string): Promise<
    | { kind: "organization"; organizationId: string }
    | { kind: "legacy_user"; userId: string }
    | null
> {
    const org = await prisma.organization.findUnique({
        where: { slug },
        select: { id: true },
    });
    if (org) return { kind: "organization", organizationId: org.id };

    const owner = await prisma.user.findFirst({
        where: { companySlug: slug, userRole: UserRole.RECRUITER },
        select: { id: true },
    });
    if (owner) return { kind: "legacy_user", userId: owner.id };
    return null;
}
