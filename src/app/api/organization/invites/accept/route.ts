import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { api500 } from "@/lib/apiError";

export const dynamic = "force-dynamic";

function normEmail(s: string) {
    return s.trim().toLowerCase();
}

/**
 * POST /api/organization/invites/accept
 * Body: { token } — signed-in recruiter must match invite email.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id as string | undefined;
        const sessionEmail = normEmail(session?.user?.email ?? "");

        if (!userId || !sessionEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const token = String(body.token ?? "").trim();
        if (!token) {
            return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
        }

        const invite = await prisma.organizationInvite.findUnique({
            where: { token },
            include: { organization: true },
        });

        if (!invite || invite.expiresAt < new Date()) {
            return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
        }

        if (normEmail(invite.email) !== sessionEmail) {
            return NextResponse.json(
                { error: "Sign in with the email address that received the invite" },
                { status: 403 },
            );
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { userRole: true, organizationId: true },
        });

        if (dbUser?.userRole !== UserRole.RECRUITER) {
            return NextResponse.json(
                { error: "Only recruiter accounts can join an organization" },
                { status: 403 },
            );
        }

        const org = invite.organization;

        const outcome = await prisma.$transaction(async (tx) => {
            const userUpdate = await tx.user.updateMany({
                where: { id: userId, organizationId: null },
                data: {
                    organizationId: org.id,
                    organizationRole: invite.role,
                    companySlug: org.slug,
                    companyName: org.name,
                    companyWebsite: org.website ?? undefined,
                    companyLogoUrl: org.logoUrl ?? undefined,
                },
            });
            if (userUpdate.count === 0) {
                return { linked: false as const };
            }
            await tx.job.updateMany({
                where: { companyId: userId },
                data: { organizationId: org.id },
            });
            await tx.application.updateMany({
                where: { companyId: userId },
                data: { organizationId: org.id },
            });
            await tx.organizationInvite.delete({ where: { id: invite.id } });
            return { linked: true as const };
        });

        if (!outcome.linked) {
            return NextResponse.json(
                { error: "Your account is already linked to an organization" },
                { status: 409 },
            );
        }

        return NextResponse.json({
            ok: true,
            companySlug: org.slug,
            organizationId: org.id,
        });
    } catch (e) {
        return api500("Failed to accept invite", "POST /api/organization/invites/accept", e);
    }
}
