import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/admin/is-platform-admin";
import { viewedCompanyScopeFromSlug } from "@/lib/admin/viewed-company-from-slug";

export type OrgScopeResult =
    | { ok: true; organizationId: string; platformAdminView: boolean }
    | { ok: false; status: number; error: string };

/**
 * Resolves `organizationId` for org APIs: normal recruiters use their membership;
 * platform admins may pass `?companySlug=` matching `/c/:slug`.
 */
export async function resolveOrganizationIdFromRequest(req: Request): Promise<OrgScopeResult> {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
        return { ok: false, status: 401, error: "Unauthorized" };
    }

    const viewSlug = new URL(req.url).searchParams.get("companySlug")?.trim() ?? "";
    if (viewSlug && (await isPlatformAdmin(session?.user?.email))) {
        const scope = await viewedCompanyScopeFromSlug(viewSlug);
        if (!scope) {
            return { ok: false, status: 404, error: "Company not found" };
        }
        if (scope.kind === "organization") {
            return { ok: true, organizationId: scope.organizationId, platformAdminView: true };
        }
        const legacy = await prisma.user.findUnique({
            where: { id: scope.profileWriteUserId },
            select: { organizationId: true },
        });
        if (!legacy?.organizationId) {
            return { ok: false, status: 403, error: "No organization for this company" };
        }
        return { ok: true, organizationId: legacy.organizationId, platformAdminView: true };
    }

    const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { userRole: true, organizationId: true },
    });
    if (me?.userRole !== UserRole.RECRUITER || !me.organizationId) {
        return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true, organizationId: me.organizationId, platformAdminView: false };
}
