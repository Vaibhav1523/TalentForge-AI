import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { api500 } from '@/lib/apiError';

/**
 * PATCH /api/applications/[id]
 * Withdraw an application - only the candidate who applied
 */
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id as string | undefined;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const applicationId = params.id;
        const body = await req.json();

        // Fetch both ownership and current status in one round-trip
        const existingApp = await prisma.application.findUnique({
            where: { id: applicationId },
            select: { candidateId: true, status: true }
        });

        if (!existingApp) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        if (existingApp.candidateId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (body.status === 'WITHDRAWN') {
            // Terminal states based on the ApplicationStatus enum (no ACCEPTED value exists)
            const terminalStates = ['REJECTED', 'HIRED', 'WITHDRAWN'];
            if (terminalStates.includes(existingApp.status)) {
                return NextResponse.json(
                    { error: `Cannot withdraw application with status '${existingApp.status}'.` },
                    { status: 409 }
                );
            }

            // Atomic update: only succeeds if the status is still non-terminal,
            // preventing a TOCTOU race where a concurrent recruiter action changes the status
            // between the check above and the write below.
            const [updatedCount, updatedApps] = await prisma.$transaction([
                prisma.application.updateMany({
                    where: { id: applicationId, status: { notIn: terminalStates as any } },
                    data: { status: 'WITHDRAWN' }
                }),
                prisma.application.findMany({ where: { id: applicationId } })
            ]);

            if (updatedCount.count === 0) {
                return NextResponse.json(
                    { error: "Application could not be withdrawn (status may have changed)." },
                    { status: 409 }
                );
            }

            return NextResponse.json(updatedApps[0]);
        }

        return NextResponse.json({ error: "Invalid status update. Only 'WITHDRAWN' is allowed." }, { status: 400 });
    } catch (error) {
        return api500("Failed to withdraw application", "PATCH /api/applications/[id]", error);
    }
}
