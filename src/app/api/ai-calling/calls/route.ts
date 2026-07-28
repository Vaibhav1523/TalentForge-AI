import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveCompanyAuth } from "@/lib/admin/resolve-company";
import { applicationWhereForCompanyScope } from "@/lib/company-scope";
import type { Prisma } from "@prisma/client";
import { api500 } from "@/lib/apiError";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai-calling/calls?slug=xxx&jobId=xxx
 * Fetch AI call history for the company, optionally filtered by job.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug")?.trim();
    const jobId = searchParams.get("jobId")?.trim();
    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
    const rawPageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
    const pageSize = Math.min(50, Math.max(1, Number.isNaN(rawPageSize) ? 20 : rawPageSize));
    const skip = (page - 1) * pageSize;

    const auth = await resolveCompanyAuth(slug);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const where: Prisma.AICallWhereInput = {
      application: applicationWhereForCompanyScope(auth),
    };
    if (jobId && /^[a-f\d]{24}$/i.test(jobId)) {
      where.jobId = jobId;
    }

    const [total, calls] = await prisma.$transaction([
      prisma.aICall.count({ where }),
      prisma.aICall.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    const candidateIds = Array.from(new Set(calls.map((c) => c.candidateId)));
    const jobIds = Array.from(new Set(calls.map((c) => c.jobId)));

    const [candidates, jobs] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true, name: true, email: true, profileImageUrl: true },
      }),
      prisma.job.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, title: true, company: true },
      }),
    ]);

    const candidateMap = new Map(candidates.map((c) => [c.id, c]));
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    const enriched = calls.map((call) => ({
      ...call,
      candidate: candidateMap.get(call.candidateId) ?? null,
      job: jobMap.get(call.jobId) ?? null,
    }));

    return NextResponse.json({
      data: enriched,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    return api500("Failed to fetch calls", "GET /api/ai-calling/calls", error);
  }
}
