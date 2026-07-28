import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? "";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "recruiter") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GEMINI_KEY) {
    return NextResponse.json(
      { error: "AI generation is not configured. Please set GEMINI_API_KEY." },
      { status: 503 }
    );
  }

  let body: {
    title?: string;
    company?: string;
    employmentType?: string;
    workMode?: string;
    category?: string;
    skills?: string[];
    expMin?: string;
    expMax?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, company, employmentType, workMode, category, skills, expMin, expMax } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Job title is required" }, { status: 400 });
  }

  const expRange =
    expMin && expMax
      ? `${expMin}–${expMax} years`
      : expMin
        ? `${expMin}+ years`
        : null;

  const prompt = `You are a professional recruiter writing a job description for a company's careers page.

Generate a polished, engaging job description in HTML (using <h3>, <p>, <ul>, <li>, <strong> tags only — no <html>, <head>, <body>, or wrapper tags).

Structure it with these sections:
1. **About the Role** — 2-3 sentence overview of what the role entails
2. **Responsibilities** — 5-7 bullet points
3. **Requirements** — 5-7 bullet points covering must-have qualifications
4. **Nice to Have** — 3-4 bullet points
5. **What We Offer** — 3-5 bullet points about perks/benefits (keep generic if company unknown)

Use a professional but warm tone. Be specific and avoid generic filler. Do NOT include the job title as a heading (it's already shown above).

Job details:
- Title: ${title}
${company ? `- Company: ${company}` : ""}
${employmentType ? `- Type: ${employmentType}` : ""}
${workMode ? `- Work Mode: ${workMode}` : ""}
${category ? `- Category: ${category}` : ""}
${skills && skills.length > 0 ? `- Key Skills: ${skills.join(", ")}` : ""}
${expRange ? `- Experience: ${expRange}` : ""}

Return ONLY the HTML content, nothing else.`;

  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);

    let lastErr: unknown;
    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const html = text
          .replace(/^```html\s*/i, "")
          .replace(/```\s*$/, "")
          .trim();

        return NextResponse.json({ html });
      } catch (modelErr: unknown) {
        lastErr = modelErr;
        const status = (modelErr as { status?: number }).status;
        if (status === 429 || status === 404) continue;
        throw modelErr;
      }
    }

    console.error("[/api/ai/generate-jd] All models rate-limited:", lastErr);
    return NextResponse.json(
      { error: "AI is temporarily busy. Please wait a minute and try again." },
      { status: 429 }
    );
  } catch (err) {
    console.error("[/api/ai/generate-jd] Gemini error:", err);
    return NextResponse.json(
      { error: "Failed to generate description. Please try again." },
      { status: 500 }
    );
  }
}
