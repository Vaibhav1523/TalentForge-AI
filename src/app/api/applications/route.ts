import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { api500 } from "@/lib/apiError";
import { ApplicationStatus, UserRole } from "@prisma/client";
import path from 'path';

/**
 * POST /api/applications
 * Submit a job application
 * 🔒 SECURITY: Verifies job exists and is ACTIVE
 * 🔒 SECURITY: Gets companyId from job (not from request body)
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { userRole: true }
        });
        if (dbUser?.userRole !== UserRole.CANDIDATE) {
            return NextResponse.json({ error: "Only candidates can apply" }, { status: 403 });
        }

        // 2. Parse request body
        interface ApplicationBody {
            jobId?: string;
            resumeUrl?: string;
            motivation?: string | null;
            currentCTC?: string | null;
            expectedCTC?: string | null;
            currentCurrency?: string | null;
            expectedCurrency?: string | null;
            noticePeriod?: string | null;
            city?: string | null;
        }
        let body: ApplicationBody;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { jobId, resumeUrl, motivation, currentCTC, expectedCTC, currentCurrency, expectedCurrency, noticePeriod, city } = body;

        // 3. Validate required fields
        if (!jobId || !resumeUrl) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 🛡️ SECURITY: Prevent Stored XSS by validating URL protocol
        let isInternal = false;
        try {
            // GCS bare object names from /api/upload/resume look like "resumes/userId-ts-name.ext"
            if (/^resumes\/[^/]/.test(resumeUrl) && !resumeUrl.includes('..')) {
                isInternal = true;
            } else {
                const parsedUrl = new URL(resumeUrl, 'http://localhost');
                const normalizedResume = path.posix.normalize(parsedUrl.pathname);
                isInternal = (normalizedResume.startsWith('/uploads/resumes/') || normalizedResume.startsWith('/private-resumes/')) &&
                    !normalizedResume.includes('..') && !normalizedResume.includes('\\');
            }
        } catch (e) {
            isInternal = false;
        }

        if (!isInternal) {
            try {
                const url = new URL(resumeUrl);
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    throw new Error("Invalid protocol");
                }
            } catch (e) {
                return NextResponse.json({
                    error: "Invalid resume URL. Please provide a valid public link (https://...) or upload a file."
                }, { status: 400 });
            }
        }

        // 4. 🔒 SECURITY: Verify job exists and is ACTIVE
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                companyId: true,
                organizationId: true,
                status: true,
                title: true,
            }
        });

        if (!job) {
            return NextResponse.json({
                error: "Job not found"
            }, { status: 404 });
        }

        // 🔒 SECURITY: Only allow applications to ACTIVE jobs
        if (job.status !== 'ACTIVE') {
            return NextResponse.json({
                error: `This job is not accepting applications (Status: ${job.status})`
            }, { status: 400 });
        }

        // 6. Check if user already applied to this job
        const existingApplication = await prisma.application.findFirst({
            where: {
                jobId: jobId,
                candidateId: userId
            }
        });

        let application;
        let wasUpdated = false;

        // Shared application fields (used for both create and re-apply update)
        const applicationData = {
            resumeUrl,
            motivation: motivation ?? null,
            currentCTC: currentCTC ?? null,
            expectedCTC: expectedCTC ?? null,
            currentCurrency: currentCurrency ?? null,
            expectedCurrency: expectedCurrency ?? null,
            noticePeriod: noticePeriod ?? null,
            city: city ?? null,
            status: ApplicationStatus.APPLIED,
        };

        if (existingApplication) {
            if (existingApplication.status === ApplicationStatus.WITHDRAWN) {
                // User is Re-Applying
                application = await prisma.application.update({
                    where: { id: existingApplication.id },
                    data: {
                        ...applicationData,
                        appliedAt: new Date(), // Refresh the application date
                        organizationId: job.organizationId ?? null,
                    }
                });
                wasUpdated = true;
            } else {
                return NextResponse.json({
                    error: "You have already applied to this job"
                }, { status: 400 });
            }
        } else {
            // 🔒 SECURITY: Create application with companyId from job
            application = await prisma.application.create({
                data: {
                    ...applicationData,
                    jobId,
                    candidateId: userId,
                    companyId: job.companyId,
                    organizationId: job.organizationId ?? undefined,
                }
            });
        }

        return NextResponse.json(application, { status: wasUpdated ? 200 : 201 });

    } catch (error) {
        return api500("Failed to submit application", "POST /api/applications", error);
    }
}

/**
 * GET /api/applications
 * Get all applications for the authenticated candidate
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const sessionUser = session?.user;
        let userId = sessionUser?.id;
        const isValidObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

        // If id is missing or malformed, resolve once by email.
        if ((!userId || !isValidObjectId(userId)) && sessionUser?.email) {
            const userByEmail = await prisma.user.findUnique({
                where: { email: sessionUser.email },
                select: { id: true },
            });
            userId = userByEmail?.id;
        }

        if (!userId || !isValidObjectId(userId)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const statusFilter = searchParams.get("status")?.toUpperCase();
        const jobIdFilter = searchParams.get("jobId");

        const allowed: ApplicationStatus[] = ["APPLIED", "SHORTLISTED", "REJECTED", "INTERVIEW", "HIRED", "WITHDRAWN"];
        const query: { candidateId: string; status?: ApplicationStatus; jobId?: string } = { candidateId: userId };
        if (statusFilter && allowed.includes(statusFilter as ApplicationStatus)) {
            query.status = statusFilter as ApplicationStatus;
        }
        if (jobIdFilter) {
            // Invalid ObjectId should not throw at the database layer.
            if (!/^[a-f\d]{24}$/i.test(jobIdFilter)) {
                return NextResponse.json([]);
            }
            query.jobId = jobIdFilter;
        }

        // Avoid hard relation include here so orphaned job references cannot crash
        // candidate application listing in Mongo-backed deployments.
        const applications = await prisma.application.findMany({
            where: query,
            select: {
                id: true,
                jobId: true,
                candidateId: true,
                companyId: true,
                resumeUrl: true,
                motivation: true,
                currentCTC: true,
                expectedCTC: true,
                currentCurrency: true,
                expectedCurrency: true,
                noticePeriod: true,
                city: true,
                status: true,
                appliedAt: true,
                interviewScheduledAt: true,
            },
            orderBy: { appliedAt: 'desc' }
        });

        if (applications.length === 0) {
            return NextResponse.json([]);
        }

        const jobIds = Array.from(new Set(applications.map((app) => app.jobId)));
        const jobs = await prisma.job.findMany({
            where: { id: { in: jobIds } },
            select: {
                id: true,
                title: true,
                company: true,
                location: true,
                employmentType: true,
                category: true,
                salary: true,
                currency: true,
                experienceMin: true,
                experienceMax: true,
            }
        });

        const jobById = new Map(jobs.map((job) => [job.id, job]));
        const response = applications.map((app) => ({
            ...app,
            job: jobById.get(app.jobId) ?? null,
        }));

        return NextResponse.json(response);

    } catch (error) {
        return api500("Failed to fetch applications", "GET /api/applications", error);
    }
}
