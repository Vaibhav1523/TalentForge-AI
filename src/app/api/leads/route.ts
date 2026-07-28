import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const freeEmailDomains: string[] = require("free-email-domains");
const FREE_EMAIL_DOMAINS = new Set(freeEmailDomains);

// Resolved at request time so the build doesn't fail when env vars are absent
function getEmailFrom(): string {
  const v = process.env.EMAIL_FROM;
  if (!v) throw new Error("[/api/leads] Missing required environment variable: EMAIL_FROM");
  return v;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPersonalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && FREE_EMAIL_DOMAINS.has(domain);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function sanitizeForSubject(value: string, maxLength = 78): string {
  const cleaned = value
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, maxLength);
  return cleaned || "(no name)";
}

export async function POST(req: NextRequest) {
  const EMAIL_FROM = getEmailFrom();
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    let body: { name?: string; email?: string; company?: string; phone?: string; roles?: string };
    try {
      body = await req.json() as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { name, email, company, phone, roles } = body;

    if (!name || !email || !company) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, company" },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (isPersonalEmail(email)) {
      return NextResponse.json(
        { error: "Please use your business email address." },
        { status: 400 }
      );
    }

    // Save lead the moment the form is submitted
    const lead = await prisma.lead.create({
      data: { name, email, company, phone: phone ?? null, roles: roles ?? null },
    });

    // Notify your team (fire-and-forget)
    resend.emails
      .send({
        from: EMAIL_FROM,
        to: EMAIL_FROM,
        subject: `New lead: ${sanitizeForSubject(name)} — ${sanitizeForSubject(company)}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;">
            <h2 style="margin:0 0 16px;">New Lead</h2>
            <table style="border-collapse:collapse;width:100%;font-size:14px;">
              <tr><td style="padding:6px 0;color:#555;width:100px;">Name</td><td style="font-weight:600;">${escapeHtml(name)}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Email</td><td>${escapeHtml(email)}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Company</td><td>${escapeHtml(company)}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Phone</td><td>${escapeHtml(phone ?? "—")}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Roles</td><td>${escapeHtml(roles ?? "—")}</td></tr>
            </table>
            <p style="margin-top:16px;color:#888;font-size:13px;">They are now selecting a call slot via Cal.com.</p>
          </div>
        `,
      })
      .catch((err: unknown) => console.error("[/api/leads] email error:", err));

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (err) {
    console.error("[/api/leads] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
