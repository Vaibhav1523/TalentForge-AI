import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveCompanyAuth } from "@/lib/admin/resolve-company";
import { recruiterCanAccessApplication } from "@/lib/company-scope";
import { api500 } from "@/lib/apiError";

const BLAND_API_KEY = process.env.BLAND_API_KEY ?? "";
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "hookstep.in";
const BLAND_API_URL = "https://api.bland.ai/v1/calls";

/**
 * POST /api/ai-calling/initiate
 * Initiate an AI screening call to a candidate.
 * Body: { applicationId, slug?, phoneNumber? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveCompanyAuth();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!BLAND_API_KEY) {
      return NextResponse.json(
        { error: "AI calling is not configured. Please set BLAND_API_KEY." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { applicationId, phoneNumber: overridePhone } = body as {
      applicationId?: string;
      phoneNumber?: string;
    };

    if (!applicationId || !/^[a-f\d]{24}$/i.test(applicationId)) {
      return NextResponse.json({ error: "Valid applicationId is required" }, { status: 400 });
    }

    const application = await prisma.application.findFirst({
      where: { id: applicationId },
      include: {
        job: { select: { id: true, title: true, company: true, skills: true } },
        candidate: { select: { id: true, name: true, phoneNumber: true, email: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const allowed = await recruiterCanAccessApplication(auth.sessionUserId, {
      companyId: application.companyId,
      organizationId: application.organizationId,
      jobId: application.jobId,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const candidatePhone = overridePhone?.trim() || application.candidate.phoneNumber;
    if (!candidatePhone) {
      return NextResponse.json(
        { error: "Candidate has no phone number. Please provide one." },
        { status: 400 }
      );
    }

    const questions = await prisma.interviewQuestion.findMany({
      where: { jobId: application.jobId },
      orderBy: { order: "asc" },
    });

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No screening questions configured for this job. Please add questions first." },
        { status: 400 }
      );
    }

    const questionList = questions
      .map((q, i) => `${i + 1}. ${q.question}`)
      .join("\n");

    const task = `You are an AI screening assistant calling on behalf of ${application.job.company} for the "${application.job.title}" position.

The candidate's name is ${application.candidate.name || "the candidate"}.

Your goal is to conduct a brief phone screening by asking the following questions one at a time. Wait for the candidate to answer each question fully before moving to the next one. Be polite, professional, and conversational.

Start by introducing yourself: "Hi ${application.candidate.name?.split(" ")[0] || "there"}, this is an AI assistant calling from ${application.job.company} regarding the ${application.job.title} position you applied for. Do you have a few minutes for a quick screening?"

If they agree, proceed with these questions:
${questionList}

After all questions are answered:
- Thank them for their time
- Let them know the hiring team will review their responses and get back to them
- Say goodbye politely

Important guidelines:
- If they can't talk right now, be understanding and end the call politely
- Keep the conversation natural and don't sound robotic
- If they ask about salary or benefits, politely let them know the recruiter will discuss those details
- If they go off-topic, gently steer back to the questions
- Do not make up information about the company or role`;

    const aiCall = await prisma.aICall.create({
      data: {
        jobId: application.jobId,
        applicationId: application.id,
        candidateId: application.candidateId,
        companyId: application.companyId,
        phoneNumber: candidatePhone,
        status: "QUEUED",
        questions: questions.map((q) => q.question),
      },
    });

    try {
      const protocol = APP_DOMAIN.includes("localhost") ? "http" : "https";
      const webhookUrl = `${protocol}://${APP_DOMAIN}/api/ai-calling/webhook`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      let blandResponse: Response;
      try {
        blandResponse = await fetch(BLAND_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: BLAND_API_KEY,
          },
          signal: controller.signal,
          body: JSON.stringify({
            phone_number: candidatePhone,
            task,
            voice: "maya",
            reduce_latency: true,
            record: true,
            webhook: webhookUrl,
            wait_for_greeting: true,
            first_sentence: `Hi ${application.candidate.name?.split(" ")[0] || "there"}, this is an AI assistant calling from ${application.job.company} regarding your application for the ${application.job.title} position. Do you have a few minutes?`,
            max_duration: 15,
          }),
        });
      } finally {
        clearTimeout(timeout);
      }

      const blandData = await blandResponse.json();

      if (!blandResponse.ok) {
        await prisma.aICall.update({
          where: { id: aiCall.id },
          data: { status: "FAILED" },
        });
        console.error("[ai-calling/initiate] Bland.ai error:", {
          status: blandResponse.status,
          errorCode: blandData?.error_code ?? blandData?.code ?? "unknown",
          message: String(blandData?.message ?? blandData?.error ?? "").slice(0, 200),
        });
        return NextResponse.json(
          { error: "Failed to initiate call. Please try again." },
          { status: 502 }
        );
      }

      await prisma.aICall.update({
        where: { id: aiCall.id },
        data: {
          providerCallId: blandData.call_id,
          status: "IN_PROGRESS",
        },
      });

      return NextResponse.json({
        data: {
          callId: aiCall.id,
          providerCallId: blandData.call_id,
          status: "IN_PROGRESS",
          phoneNumber: candidatePhone,
          candidateName: application.candidate.name,
          jobTitle: application.job.title,
        },
      });
    } catch (providerError) {
      await prisma.aICall.update({
        where: { id: aiCall.id },
        data: { status: "FAILED" },
      });
      console.error("[ai-calling/initiate] Provider error:", providerError);
      return NextResponse.json(
        { error: "Failed to connect to calling service." },
        { status: 502 }
      );
    }
  } catch (error) {
    return api500("Failed to initiate call", "POST /api/ai-calling/initiate", error);
  }
}
