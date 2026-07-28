import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveCompanyAuth } from "@/lib/admin/resolve-company";
import { jobByIdWhereForCompanyScope } from "@/lib/company-scope";
import { api500 } from "@/lib/apiError";

/**
 * GET /api/ai-calling/questions?jobId=xxx&slug=xxx
 * Fetch screening questions for a job (ordered).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug")?.trim();
    const jobId = searchParams.get("jobId")?.trim();

    const auth = await resolveCompanyAuth(slug);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!jobId || !/^[a-f\d]{24}$/i.test(jobId)) {
      return NextResponse.json({ error: "Valid jobId is required" }, { status: 400 });
    }

    const job = await prisma.job.findFirst({
      where: jobByIdWhereForCompanyScope(auth, jobId),
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const questions = await prisma.interviewQuestion.findMany({
      where: { jobId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ data: questions });
  } catch (error) {
    return api500("Failed to fetch questions", "GET /api/ai-calling/questions", error);
  }
}

/**
 * POST /api/ai-calling/questions
 * Create or bulk-update screening questions for a job.
 * Body: { jobId, slug?, questions: [{ id?, question, order }] }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveCompanyAuth();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { jobId, slug, questions } = body as {
      jobId?: string;
      slug?: string;
      questions?: { id?: string; question: string; order: number }[];
    };

    let scopeAuth = auth;

    if (slug) {
      const slugAuth = await resolveCompanyAuth(slug);
      if (!slugAuth.ok) {
        return NextResponse.json({ error: slugAuth.error }, { status: slugAuth.status });
      }
      scopeAuth = slugAuth;
    }

    if (!jobId || !/^[a-f\d]{24}$/i.test(jobId)) {
      return NextResponse.json({ error: "Valid jobId is required" }, { status: 400 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "At least one question is required" }, { status: 400 });
    }

    if (questions.length > 20) {
      return NextResponse.json({ error: "Maximum 20 questions allowed" }, { status: 400 });
    }

    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      if (typeof item !== "object" || item === null) {
        return NextResponse.json({ error: `Question at index ${i} is not an object` }, { status: 400 });
      }
      if (typeof item.question !== "string" || item.question.trim() === "") {
        return NextResponse.json({ error: `Question at index ${i} has empty or invalid text` }, { status: 400 });
      }
      if (item.order !== undefined && (!Number.isFinite(item.order) || item.order < 0)) {
        return NextResponse.json({ error: `Question at index ${i} has invalid order` }, { status: 400 });
      }
    }

    const job = await prisma.job.findFirst({
      where: jobByIdWhereForCompanyScope(scopeAuth, jobId),
      select: { id: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const created = await prisma.$transaction(async (tx) => {
      await tx.interviewQuestion.deleteMany({ where: { jobId } });
      const results = [];
      for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];
        results.push(
          await tx.interviewQuestion.create({
            data: {
              jobId,
              question: q.question.trim(),
              order: q.order ?? idx,
            },
          })
        );
      }
      return results;
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return api500("Failed to save questions", "POST /api/ai-calling/questions", error);
  }
}
