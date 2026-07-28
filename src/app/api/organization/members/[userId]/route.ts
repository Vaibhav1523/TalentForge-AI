import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { api500 } from "@/lib/apiError";
import { resolveOrganizationIdFromRequest } from "@/lib/admin/organization-scope-from-request";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/organization/members/[userId] — OWNER removes a MEMBER/ADMIN (not themselves).
 * Platform admins: `?companySlug=`.
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ userId: string }> },
) {
    try {
        const session = await getServerSession(authOptions);
        const actorId = session?.user?.id as string | undefined;
        if (!actorId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId: targetId } = await params;
        if (!targetId || targetId === actorId) {
            return NextResponse.json({ error: "Cannot remove yourself this way" }, { status: 400 });
        }

        const orgScope = await resolveOrganizationIdFromRequest(req);
        if (!orgScope.ok) {
            return NextResponse.json({ error: orgScope.error }, { status: orgScope.status });
        }

        const actor = await prisma.user.findUnique({
            where: { id: actorId },
            select: { organizationId: true, organizationRole: true, userRole: true },
        });

        if (!orgScope.platformAdminView) {
            if (
                actor?.userRole !== UserRole.RECRUITER ||
                !actor.organizationId ||
                actor.organizationRole !== "OWNER" ||
                actor.organizationId !== orgScope.organizationId
            ) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const target = await prisma.user.findUnique({
            where: { id: targetId },
            select: { organizationId: true, organizationRole: true, userRole: true },
        });

        if (
            !target ||
            target.organizationId !== orgScope.organizationId ||
            target.userRole !== UserRole.RECRUITER
        ) {
            return NextResponse.json({ error: "User not found in your organization" }, { status: 404 });
        }

        if (target.organizationRole === "OWNER") {
            return NextResponse.json({ error: "Cannot remove an owner" }, { status: 403 });
        }

        await prisma.user.update({
            where: { id: targetId },
            data: {
                organizationId: null,
                organizationRole: null,
            },
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        return api500("Failed to remove member", "DELETE /api/organization/members/[userId]", e);
    }
}
