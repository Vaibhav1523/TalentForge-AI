import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSuperAdminByEmail } from "@/lib/admin/super-admin-core";

const VALID_USER_ROLES: Set<string> = new Set(Object.values(UserRole));

async function requireSuperAdmin() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!(await isSuperAdminByEmail(email))) return null;
    return session?.user?.id as string;
}

function prismaErrorResponse(err: unknown): NextResponse {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") return NextResponse.json({ error: "Record not found" }, { status: 404 });
        if (err.code === "P2002") return NextResponse.json({ error: "Constraint violation" }, { status: 409 });
    }
    console.error("[admin/records]", err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function PUT(req: NextRequest) {
    const currentUserId = await requireSuperAdmin();
    if (!currentUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const type = String(body.type ?? "");
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    try {
        if (type === "user") {
            const isSelf = id === currentUserId;
            const data: Record<string, unknown> = {};
            if (body.userRole !== undefined) {
                const role = String(body.userRole);
                if (!VALID_USER_ROLES.has(role)) {
                    return NextResponse.json({ error: "Invalid userRole" }, { status: 400 });
                }
                data.userRole = role;
            }
            if (body.isAdmin !== undefined && !isSelf) data.isAdmin = body.isAdmin === true;
            if (body.name !== undefined) data.name = String(body.name).trim();
            if (body.email !== undefined && !isSelf) data.email = String(body.email).trim().toLowerCase();
            if (Object.keys(data).length === 0) {
                return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
            }
            const user = await prisma.user.update({ where: { id }, data });
            return NextResponse.json({ success: true, record: { id: user.id } });
        }

        if (type === "job") {
            const data: Record<string, unknown> = {};
            if (body.status !== undefined) data.status = String(body.status);
            if (body.title !== undefined) data.title = String(body.title).trim();
            const job = await prisma.job.update({ where: { id }, data });
            return NextResponse.json({ success: true, record: { id: job.id } });
        }

        if (type === "application") {
            const data: Record<string, unknown> = {};
            if (body.status !== undefined) data.status = String(body.status);
            const app = await prisma.application.update({ where: { id }, data });
            return NextResponse.json({ success: true, record: { id: app.id } });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (err) {
        return prismaErrorResponse(err);
    }
}

export async function DELETE(req: NextRequest) {
    if (!await requireSuperAdmin()) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const type = String(body.type ?? "");
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    try {
        if (type === "user") {
            await prisma.$transaction(async (tx) => {
                const jobIds = (await tx.job.findMany({
                    where: { companyId: id },
                    select: { id: true },
                })).map((j) => j.id);

                if (jobIds.length > 0) {
                    await tx.application.deleteMany({ where: { jobId: { in: jobIds } } });
                }
                await tx.application.deleteMany({ where: { candidateId: id } });
                await tx.job.deleteMany({ where: { companyId: id } });
                await tx.user.delete({ where: { id } });
            });
            return NextResponse.json({ success: true });
        }

        if (type === "job") {
            await prisma.$transaction([
                prisma.application.deleteMany({ where: { jobId: id } }),
                prisma.job.delete({ where: { id } }),
            ]);
            return NextResponse.json({ success: true });
        }

        if (type === "application") {
            await prisma.application.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (err) {
        return prismaErrorResponse(err);
    }
}
