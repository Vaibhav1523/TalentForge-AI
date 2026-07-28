import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { api500 } from "@/lib/apiError";
import { resolveOrganizationIdFromRequest } from "@/lib/admin/organization-scope-from-request";

export const dynamic = "force-dynamic";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normEmail(s: string) {
    return s.trim().toLowerCase();
}

/**
 * GET /api/organization/invites — pending invites for your org (OWNER/ADMIN).
 * Platform admins: `?companySlug=`.
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

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { userRole: true, organizationId: true, organizationRole: true },
        });

        if (!orgScope.platformAdminView) {
            if (user?.userRole !== UserRole.RECRUITER || user.organizationId !== orgScope.organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            if (user.organizationRole !== "OWNER" && user.organizationRole !== "ADMIN") {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const invites = await prisma.organizationInvite.findMany({
            where: { organizationId: orgScope.organizationId, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
            select: { id: true, email: true, createdAt: true, expiresAt: true, role: true },
        });

        return NextResponse.json({ invites });
    } catch (e) {
        return api500("Failed to list invites", "GET /api/organization/invites", e);
    }
}

/**
 * POST /api/organization/invites — create invite (OWNER/ADMIN). Body: { email }
 * Platform admins: `?companySlug=`.
 */
export async function POST(req: Request) {
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

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { userRole: true, organizationId: true, organizationRole: true, email: true },
        });

        if (!orgScope.platformAdminView) {
            if (user?.userRole !== UserRole.RECRUITER || user.organizationId !== orgScope.organizationId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            if (user.organizationRole !== "OWNER" && user.organizationRole !== "ADMIN") {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const body = await req.json().catch(() => ({}));
        const email = normEmail(String(body.email ?? ""));
        if (!email || !email.includes("@")) {
            return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
        }

        if (email === normEmail(user?.email ?? "")) {
            return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
        }

        const existingMember = await prisma.user.findFirst({
            where: { organizationId: orgScope.organizationId, email },
            select: { id: true },
        });
        if (existingMember) {
            return NextResponse.json({ error: "That user is already in your organization" }, { status: 409 });
        }

        const pendingInvite = await prisma.organizationInvite.findFirst({
            where: {
                organizationId: orgScope.organizationId,
                email,
                expiresAt: { gt: new Date() },
            },
            select: { id: true },
        });
        if (pendingInvite) {
            return NextResponse.json(
                { error: "An invite is already pending for this email" },
                { status: 409 },
            );
        }

        await prisma.organizationInvite.deleteMany({
            where: {
                organizationId: orgScope.organizationId,
                email,
                expiresAt: { lte: new Date() },
            },
        });

        const token = randomBytes(24).toString("hex");
        const invite = await prisma.organizationInvite.create({
            data: {
                organizationId: orgScope.organizationId,
                email,
                token,
                invitedByUserId: userId,
                role: "MEMBER",
                expiresAt: new Date(Date.now() + INVITE_TTL_MS),
            },
        });

        const origin =
            process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
            (typeof req.headers.get === "function" ? new URL(req.url).origin : "");

        return NextResponse.json({
            id: invite.id,
            email: invite.email,
            expiresAt: invite.expiresAt,
            invitePath: `/join?token=${encodeURIComponent(token)}`,
            inviteUrl: origin ? `${origin}/join?token=${encodeURIComponent(token)}` : null,
        });
    } catch (e) {
        return api500("Failed to create invite", "POST /api/organization/invites", e);
    }
}
