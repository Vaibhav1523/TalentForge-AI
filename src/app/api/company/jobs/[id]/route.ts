import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { api500 } from '@/lib/apiError';
import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';
import { recruiterCanAccessJob } from '@/lib/company-scope';

async function ensureRecruiter(userId: string | undefined) {
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { userRole: true }
    });
    if (!dbUser || dbUser.userRole !== UserRole.RECRUITER) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id as string | undefined;

        // Allow public read access to individual jobs
        if (!userId) {
            const job = await prisma.job.findUnique({
                where: { id },
                include: { _count: { select: { applications: true } } },
            });
            if (!job || job.status !== "ACTIVE") {
                return NextResponse.json({ error: "Job not found" }, { status: 404 });
            }
            return NextResponse.json({ ...job, _count: { applications: 0 } });
        }

        const isAdminUser = await isPlatformAdmin(session?.user?.email);

        if (!isAdminUser) {
            const authError = await ensureRecruiter(userId);
            if (authError) return authError;
        }

        const job = await prisma.job.findUnique({
            where: { id },
            include: { _count: { select: { applications: true } } }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (!isAdminUser) {
            const ok = await recruiterCanAccessJob(userId, {
                organizationId: job.organizationId,
                companyId: job.companyId,
            });
            if (!ok) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        return NextResponse.json(job);
    } catch (error) {
        return api500("Failed to fetch job", "GET /api/company/jobs/[id]", error);
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id as string | undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdminUser = await isPlatformAdmin(session?.user?.email);

        if (!isAdminUser) {
            const authError = await ensureRecruiter(userId);
            if (authError) return authError;
        }

        const id = params.id;
        const body = await request.json();

        const existingJob = await prisma.job.findUnique({ where: { id } });

        if (!existingJob) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (!isAdminUser) {
            const ok = await recruiterCanAccessJob(userId, {
                organizationId: existingJob.organizationId,
                companyId: existingJob.companyId,
            });
            if (!ok) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const description = (typeof body.description === "string" && body.description.trim()) ? body.description : existingJob.description;
        if (!description?.trim()) {
            return NextResponse.json({ error: "Description is required" }, { status: 400 });
        }

        const updateData = {
            title: body.title ?? existingJob.title,
            location: body.location ?? existingJob.location,
            description,
            employmentType: body.employmentType ?? existingJob.employmentType,
            salary: body.salary != null ? String(body.salary) : existingJob.salary ?? undefined,
            status: body.status ?? existingJob.status,
            category: body.category ?? existingJob.category,
            skills: body.skills ?? existingJob.skills,
            currency: body.currency ?? existingJob.currency
        };

        const updatedJob = await prisma.job.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(updatedJob);
    } catch (error) {
        return api500("Failed to update job", "PUT /api/company/jobs/[id]", error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id as string | undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdminUser = await isPlatformAdmin(session?.user?.email);

        if (!isAdminUser) {
            const authError = await ensureRecruiter(userId);
            if (authError) return authError;
        }

        const id = params.id;
        const existingJob = await prisma.job.findUnique({ where: { id } });

        if (!existingJob) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (!isAdminUser) {
            const ok = await recruiterCanAccessJob(userId, {
                organizationId: existingJob.organizationId,
                companyId: existingJob.companyId,
            });
            if (!ok) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        await prisma.$transaction([
            prisma.application.deleteMany({ where: { jobId: id } }),
            prisma.job.delete({ where: { id } }),
        ]);

        return NextResponse.json({ message: "Job deleted successfully" });
    } catch (error) {
        return api500("Failed to delete job", "DELETE /api/company/jobs/[id]", error);
    }
}
