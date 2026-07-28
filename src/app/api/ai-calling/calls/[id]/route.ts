import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveCompanyAuth } from "@/lib/admin/resolve-company";
import { applicationWhereForCompanyScope } from "@/lib/company-scope";
import { api500 } from "@/lib/apiError";

/**
 * GET /api/ai-calling/calls/[id]?slug=xxx
 * Fetch a single AI call record with full transcript.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug")?.trim();
    const { id } = await params;

    const auth = await resolveCompanyAuth(slug);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid call ID" }, { status: 400 });
    }

    const call = await prisma.aICall.findFirst({
      where: {
        id,
        application: applicationWhereForCompanyScope(auth),
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const [candidate, job] = await Promise.all([
      call.candidateId
        ? prisma.user.findUnique({
            where: { id: call.candidateId },
            select: { id: true, name: true, profileImageUrl: true },
          })
        : null,
      call.jobId
        ? prisma.job.findUnique({
            where: { id: call.jobId },
            select: { id: true, title: true, company: true },
          })
        : null,
    ]);

    return NextResponse.json({
      data: { ...call, candidate, job },
    });
  } catch (error) {
    return api500("Failed to fetch call", "GET /api/ai-calling/calls/[id]", error);
  }
}
