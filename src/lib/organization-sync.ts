import { Prisma, UserRole, type OrganizationMemberRole } from "@prisma/client";
import prisma from "@/lib/prisma";

export type SyncRecruiterOrganizationResult =
    | { ok: true }
    | { ok: false; reason: "slug_conflict"; slug: string };

/**
 * Keeps Organization + recruiter User rows aligned when profile / onboarding updates company fields.
 * - Creates an Organization the first time a solo recruiter gets a slug.
 * - Updates org branding / slug for OWNER and ADMIN (slug uniqueness is global on Organization).
 */
export async function syncRecruiterOrganizationFromProfile(opts: {
    userId: string;
    companyName?: string;
    companySlug?: string;
    companyWebsite?: string | null;
    companyLogoUrl?: string | null;
    /** When true, forces org creation if missing and slug exists */
    onboardingCompleting?: boolean;
}): Promise<SyncRecruiterOrganizationResult> {
    const user = await prisma.user.findUnique({
        where: { id: opts.userId },
        select: {
            userRole: true,
            organizationId: true,
            organizationRole: true,
            companySlug: true,
            companyName: true,
            email: true,
        },
    });

    if (!user || user.userRole !== UserRole.RECRUITER) return { ok: true };

    const slug = opts.companySlug?.trim() || user.companySlug?.trim() || "";
    const name =
        opts.companyName?.trim() || user.companyName?.trim() || slug || "Company";

    if (user.organizationId) {
        const canManage =
            user.organizationRole === "OWNER" || user.organizationRole === "ADMIN";
        if (!canManage) {
            return { ok: true };
        }

        const orgData: {
            name?: string;
            website?: string | null;
            logoUrl?: string | null;
            slug?: string;
        } = {};
        if (opts.companyName !== undefined) orgData.name = opts.companyName.trim() || name;
        if (opts.companyWebsite !== undefined) orgData.website = opts.companyWebsite;
        if (opts.companyLogoUrl !== undefined) orgData.logoUrl = opts.companyLogoUrl;

        if (opts.companySlug !== undefined && canManage && opts.companySlug.trim()) {
            orgData.slug = opts.companySlug.trim();
        }

        const orgId = user.organizationId;

        const applyOrgUpdate = async (data: typeof orgData) => {
            if (Object.keys(data).length === 0) return;
            const memberSync: { companySlug?: string; companyName?: string } = {};
            if (data.slug) memberSync.companySlug = data.slug;
            if (data.name) memberSync.companyName = data.name;
            await prisma.$transaction(async (tx) => {
                await tx.organization.update({ where: { id: orgId }, data });
                if (Object.keys(memberSync).length > 0) {
                    await tx.user.updateMany({
                        where: { organizationId: orgId },
                        data: memberSync,
                    });
                }
            });
        };

        if (Object.keys(orgData).length > 0) {
            try {
                await applyOrgUpdate(orgData);
            } catch (e) {
                if (
                    e instanceof Prisma.PrismaClientKnownRequestError &&
                    e.code === "P2002" &&
                    orgData.slug
                ) {
                    console.warn("[syncRecruiterOrganizationFromProfile] organization slug unique conflict", {
                        userId: opts.userId,
                        slug: orgData.slug,
                        organizationId: orgId,
                    });
                    const { slug: _drop, ...rest } = orgData;
                    if (Object.keys(rest).length > 0) {
                        await applyOrgUpdate(rest);
                    }
                    return { ok: true };
                }
                throw e;
            }
        }
        return { ok: true };
    }

    const shouldCreate =
        Boolean(slug) &&
        (opts.onboardingCompleting || Boolean(opts.companySlug?.trim()));

    if (!shouldCreate) return { ok: true };

    try {
        await prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name,
                    slug,
                    website: opts.companyWebsite ?? undefined,
                    logoUrl: opts.companyLogoUrl ?? undefined,
                },
            });
            await tx.user.update({
                where: { id: opts.userId },
                data: {
                    organizationId: org.id,
                    organizationRole: "OWNER" as OrganizationMemberRole,
                    companySlug: slug,
                    ...(opts.companyName !== undefined && { companyName: opts.companyName.trim() || name }),
                },
            });
            await tx.job.updateMany({
                where: { companyId: opts.userId },
                data: { organizationId: org.id },
            });
            await tx.application.updateMany({
                where: { companyId: opts.userId },
                data: { organizationId: org.id },
            });
        });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            console.error("[syncRecruiterOrganizationFromProfile] organization slug already exists (create)", {
                userId: opts.userId,
                slug,
            });
            return { ok: false, reason: "slug_conflict", slug };
        }
        throw e;
    }

    return { ok: true };
}
