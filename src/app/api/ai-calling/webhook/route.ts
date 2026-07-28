import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "crypto";
import prisma from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? "";
const BLAND_WEBHOOK_SECRET = process.env.BLAND_WEBHOOK_SECRET ?? "";

function verifySignature(payload: string, signature: string): boolean {
  if (!BLAND_WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac("sha256", BLAND_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
  } catch {
    return false;
  }
}

function sanitizeTranscript(raw: string): string {
  const instructionPatterns = /^(ignore|disregard|forget|override|system:|assistant:|do not follow)\b/gim;
  let sanitized = raw.replace(instructionPatterns, "[FILTERED]");
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  if (sanitized.length > 50_000) sanitized = sanitized.slice(0, 50_000);
  return sanitized;
}

/**
 * POST /api/ai-calling/webhook
 * Bland.ai webhook — receives call completion data.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    if (BLAND_WEBHOOK_SECRET) {
      const signature = req.headers.get("x-bland-signature") ?? req.headers.get("x-webhook-signature") ?? "";
      if (!verifySignature(rawBody, signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const {
      call_id,
      status,
      concatenated_transcript,
      call_length,
      recording_url,
      completed,
    } = body as {
      call_id?: string;
      status?: string;
      concatenated_transcript?: string;
      call_length?: number;
      recording_url?: string;
      completed?: boolean;
    };

    if (!call_id) {
      return NextResponse.json({ error: "Missing call_id" }, { status: 400 });
    }

    const call = await prisma.aICall.findFirst({
      where: { providerCallId: call_id },
    });

    if (!call) {
      console.warn(`[ai-calling/webhook] Unknown call_id: ${call_id}`);
      return NextResponse.json({ ok: true });
    }

    let aiCallStatus: "COMPLETED" | "FAILED" | "NO_ANSWER" = "FAILED";
    if (status === "no-answer" || status === "voicemail") {
      aiCallStatus = "NO_ANSWER";
    } else if (status === "error") {
      aiCallStatus = "FAILED";
    } else if (completed === true) {
      aiCallStatus = "COMPLETED";
    }

    let summary: string | undefined;
    const safeTranscript = concatenated_transcript ? sanitizeTranscript(concatenated_transcript) : undefined;
    if (safeTranscript && GEMINI_KEY && aiCallStatus === "COMPLETED") {
      try {
        summary = await generateCallSummary(
          safeTranscript,
          call.questions
        );
      } catch (err) {
        console.error("[ai-calling/webhook] Summary generation failed:", err);
      }
    }

    await prisma.aICall.update({
      where: { id: call.id },
      data: {
        status: aiCallStatus,
        transcript: concatenated_transcript || null,
        summary: summary || null,
        callDuration: call_length ?? null,
        recordingUrl: recording_url || null,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ai-calling/webhook] Error:", error);
    return NextResponse.json({ ok: true });
  }
}

async function generateCallSummary(
  transcript: string,
  questions: string[]
): Promise<string> {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const questionList = questions
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  const prompt = `You are analyzing a phone screening interview transcript. The interviewer (AI assistant) asked the following questions:

${questionList}

Here is the full transcript:
---
${transcript}
---

Please provide a structured summary with:
1. **Overall Assessment**: One sentence overall impression (Positive / Neutral / Needs Review)
2. **Key Responses**: For each question, summarize the candidate's answer in 1-2 sentences
3. **Red Flags**: Any concerns or notable issues (or "None" if everything looked good)
4. **Recommendation**: Should the recruiter proceed with this candidate? (Strongly Recommend / Recommend / On the Fence / Do Not Recommend)

Keep the summary concise and actionable for a recruiter.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
