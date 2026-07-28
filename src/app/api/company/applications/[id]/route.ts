import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { api500 } from '@/lib/apiError';
import { ApplicationStatus } from '@prisma/client';
import { resolveCompanyAuth } from '@/lib/admin/resolve-company';
import { recruiterCanAccessApplication } from '@/lib/company-scope';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await resolveCompanyAuth();
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const applicationId = params.id;
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { job: true }
        });

        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        if (!auth.isSuperAdmin) {
            const ok = await recruiterCanAccessApplication(auth.sessionUserId, {
                companyId: application.companyId,
                organizationId: application.organizationId,
                jobId: application.jobId,
            });
            if (!ok) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const candidate = await prisma.user.findUnique({
            where: { id: application.candidateId },
            select: {
                id: true,
                name: true,
                email: true,
                profileImageUrl: true,
                linkedin: true,
                github: true,
                twitter: true,
            },
        });

        const responseData = {
            ...application,
            candidate: candidate || {
                id: null,
                name: 'Unknown Candidate',
                email: 'N/A',
                profileImageUrl: null
            }
        };

        return NextResponse.json(responseData);
    } catch (error) {
        return api500("Failed to fetch application", "GET /api/company/applications/[id]", error);
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await resolveCompanyAuth();
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const applicationId = params.id;
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            select: { companyId: true, organizationId: true, jobId: true }
        });

        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        if (!auth.isSuperAdmin) {
            const ok = await recruiterCanAccessApplication(auth.sessionUserId, application);
            if (!ok) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        let body: { status?: string; interviewScheduledAt?: string };
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
        }
        const { status, interviewScheduledAt } = body;

        const allowedStatuses = ['APPLIED', 'SHORTLISTED', 'REJECTED', 'INTERVIEW', 'HIRED'];

        if (!status || !allowedStatuses.includes(status)) {
            return NextResponse.json({
                error: "Invalid status value or unauthorized transition",
                allowed: allowedStatuses
            }, { status: 400 });
        }

        const updateData: { status: ApplicationStatus; interviewScheduledAt?: Date } = { status: status as ApplicationStatus };
        if (interviewScheduledAt) {
            const date = new Date(interviewScheduledAt);
            if (isNaN(date.getTime())) {
                return NextResponse.json({ error: "Invalid interviewScheduledAt date format" }, { status: 400 });
            }
            updateData.interviewScheduledAt = date;
        }

        const updatedApplication = await prisma.application.update({
            where: { id: applicationId },
            data: updateData
        });

        return NextResponse.json(updatedApplication);
    } catch (error) {
        return api500("Failed to update application", "PATCH /api/company/applications/[id]", error);
    }
}
