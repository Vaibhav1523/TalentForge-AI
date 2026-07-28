import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { api500 } from "@/lib/apiError";
import { resolveOrganizationIdFromRequest } from "@/lib/admin/organization-scope-from-request";

export const dynamic = "force-dynamic";

/**
 * GET /api/organization/members — list recruiters in your org.
 * Platform admins: `?companySlug=` (same as `/c/:slug`).
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id as string | undefined;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgScope = await resolveOrganizationIdFromRequest(req);
        if (!orgScope.ok) {
            return NextResponse.json({ error: orgScope.error }, { status: orgScope.status });
        }

        const members = await prisma.user.findMany({
            where: { organizationId: orgScope.organizationId },
            select: {
                id: true,
                name: true,
                email: true,
                profileImageUrl: true,
                organizationRole: true,
                createdAt: true,
            },
            orderBy: [{ organizationRole: "asc" }, { createdAt: "asc" }],
        });

        return NextResponse.json({ members });
    } catch (e) {
        return api500("Failed to list members", "GET /api/organization/members", e);
    }
}
