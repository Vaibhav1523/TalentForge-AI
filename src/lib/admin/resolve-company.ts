import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { isPlatformAdmin } from "@/lib/admin/is-platform-admin";
import type { CompanyAccessScope } from "@/lib/company-scope";

export type CompanyAuth =
    | ({ ok: true } & CompanyAccessScope & { companyOwnerId: string })
    | { ok: false; status: number; error: string };

/**
 * Resolves recruiter / platform-admin scope for `/api/company/*` routes.
 *
 * - Multi-recruiter org: `organizationId` is set; filter jobs/applications with that field.
 * - Legacy solo recruiter: `organizationId` is null; filter with `companyId === legacyCompanyUserId`.
 *
 * `companyOwnerId` is kept for backward compatibility and equals `legacyCompanyUserId`
 * (do not use for org-wide permission checks — use organizationId + helpers in company-scope).
 */
export async function resolveCompanyAuth(slug?: string | null): Promise<CompanyAuth> {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id as string | undefined;
    const email = session?.user?.email;

    if (!sessionUserId) {
        return { ok: false, status: 401, error: "Unauthorized" };
    }

    const isPA = await isPlatformAdmin(email);

    const dbUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: {
            userRole: true,
            organizationId: true,
            companySlug: true,
        },
    });

    if (!isPA && dbUser?.userRole !== UserRole.RECRUITER) {
        return { ok: false, status: 403, error: "Forbidden" };
    }

    const effectiveSlugForSessionUser = async (): Promise<string | null> => {
        if (dbUser?.organizationId) {
            const org = await prisma.organization.findUnique({
                where: { id: dbUser.organizationId },
                select: { slug: true },
            });
            return org?.slug ?? dbUser.companySlug ?? null;
        }
        return dbUser?.companySlug ?? null;
    };

    if (isPA && slug) {
        const org = await prisma.organization.findUnique({
            where: { slug },
            select: { id: true },
        });
        if (org) {
            const scope: CompanyAccessScope = {
                sessionUserId,
                isSuperAdmin: true,
                organizationId: org.id,
                legacyCompanyUserId: sessionUserId,
            };
            return { ok: true, ...scope, companyOwnerId: scope.legacyCompanyUserId };
        }

        const legacyOwner = await prisma.user.findFirst({
            where: { companySlug: slug, userRole: UserRole.RECRUITER },
            select: { id: true, organizationId: true },
        });
        if (!legacyOwner) {
            return { ok: false, status: 404, error: "Company not found" };
        }
        const scope: CompanyAccessScope = {
            sessionUserId,
            isSuperAdmin: true,
            organizationId: legacyOwner.organizationId ?? null,
            legacyCompanyUserId: legacyOwner.id,
        };
        return { ok: true, ...scope, companyOwnerId: scope.legacyCompanyUserId };
    }

    if (isPA && !slug) {
        const scope: CompanyAccessScope = {
            sessionUserId,
            isSuperAdmin: true,
            organizationId: dbUser?.organizationId ?? null,
            legacyCompanyUserId: sessionUserId,
        };
        return { ok: true, ...scope, companyOwnerId: scope.legacyCompanyUserId };
    }

    // Recruiter (verified above)
    const pathSlug = slug?.trim() || null;
    if (pathSlug) {
        const mine = await effectiveSlugForSessionUser();
        const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
        if (norm(mine) !== norm(pathSlug)) {
            return { ok: false, status: 403, error: "Forbidden" };
        }
    }

    const scope: CompanyAccessScope = {
        sessionUserId,
        isSuperAdmin: false,
        organizationId: dbUser?.organizationId ?? null,
        legacyCompanyUserId: sessionUserId,
    };
    return { ok: true, ...scope, companyOwnerId: scope.legacyCompanyUserId };
}
