import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export type ViewedCompanyScope =
    | { kind: "organization"; organizationId: string; profileWriteUserId: string }
    | { kind: "legacy"; profileWriteUserId: string };

/**
 * Resolve a company dashboard slug to an org or legacy recruiter row.
 * Used when a platform admin opens `/c/:slug/...` and APIs need that tenant's id.
 */
export async function viewedCompanyScopeFromSlug(slug: string): Promise<ViewedCompanyScope | null> {
    const norm = slug.trim().toLowerCase();
    if (!norm) return null;

    const org = await prisma.organization.findUnique({
        where: { slug: norm },
        select: { id: true },
    });
    if (org) {
        const owner = await prisma.user.findFirst({
            where: {
                organizationId: org.id,
                userRole: UserRole.RECRUITER,
                organizationRole: "OWNER",
            },
            select: { id: true },
        });
        const admin = await prisma.user.findFirst({
            where: {
                organizationId: org.id,
                userRole: UserRole.RECRUITER,
                organizationRole: "ADMIN",
            },
            select: { id: true },
        });
        const anyRecruiter = await prisma.user.findFirst({
            where: { organizationId: org.id, userRole: UserRole.RECRUITER },
            select: { id: true },
        });
        const profileWriteUserId = owner?.id ?? admin?.id ?? anyRecruiter?.id;
        if (!profileWriteUserId) return null;
        return { kind: "organization", organizationId: org.id, profileWriteUserId };
    }

    const legacy = await prisma.user.findFirst({
        where: { userRole: UserRole.RECRUITER, companySlug: norm },
        select: { id: true },
    });
    if (!legacy) return null;
    return { kind: "legacy", profileWriteUserId: legacy.id };
}

/** Name + logo for `/c/:slug` chrome (sidebar), keyed by route slug — not the signed-in JWT. */
export async function companyBrandingForDashboardSlug(
    slug: string,
): Promise<{ name: string | null; logoUrl: string | null }> {
    const norm = slug.trim().toLowerCase();
    if (!norm) return { name: null, logoUrl: null };

    const org = await prisma.organization.findUnique({
        where: { slug: norm },
        select: { name: true, logoUrl: true },
    });
    if (org) {
        return { name: org.name, logoUrl: org.logoUrl ?? null };
    }

    const legacy = await prisma.user.findFirst({
        where: { userRole: UserRole.RECRUITER, companySlug: norm },
        select: { companyName: true, companyLogoUrl: true },
    });
    if (!legacy) return { name: null, logoUrl: null };
    return {
        name: legacy.companyName ?? null,
        logoUrl: legacy.companyLogoUrl ?? null,
    };
}
