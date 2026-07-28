import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/admin/require-admin";

const SKILL_SAMPLE = 4000;
const JOB_SAMPLE = 4000;

/**
 * Dropdown data for admin Candidate Search. Loaded once on the client so
 * listing candidates does not re-fetch huge option payloads every time.
 */
export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const [recruiters, jobsWithSkills, candidateSkillSample] = await Promise.all([
            prisma.user.findMany({
                where: { userRole: "RECRUITER" },
                select: {
                    id: true,
                    name: true,
                    companyName: true,
                    companySlug: true,
                    organizationId: true,
                    organization: { select: { slug: true } },
                },
                orderBy: [{ companyName: "asc" }, { name: "asc" }],
            }),
            prisma.job.findMany({
                where: { status: { in: ["ACTIVE", "CLOSED"] } },
                select: {
                    id: true,
                    title: true,
                    company: true,
                    companyId: true,
                    organizationId: true,
                    skills: true,
                },
                orderBy: { createdAt: "desc" },
                take: JOB_SAMPLE,
            }),
            prisma.user.findMany({
                where: { userRole: "CANDIDATE", skills: { isEmpty: false } },
                select: { skills: true },
                take: SKILL_SAMPLE,
                orderBy: { updatedAt: "desc" },
            }),
        ]);

        const allSkills = new Set<string>();
        for (const j of jobsWithSkills) {
            for (const s of j.skills) allSkills.add(s);
        }
        for (const u of candidateSkillSample) {
            for (const s of u.skills) allSkills.add(s);
        }

        return NextResponse.json({
            recruiters: recruiters.map((r) => ({
                id: r.id,
                name: r.name ?? "Unnamed",
                companyName: r.companyName ?? "",
                companySlug: r.companySlug ?? null,
                organizationId: r.organizationId ?? null,
                organizationSlug: r.organization?.slug ?? null,
            })),
            jobs: jobsWithSkills.map((j) => ({
                id: j.id,
                title: j.title,
                company: j.company,
                companyId: j.companyId,
                organizationId: j.organizationId ?? null,
            })),
            allSkills: Array.from(allSkills).sort((a, b) => a.localeCompare(b)),
        });
    } catch (err) {
        console.error("[admin/candidates/options]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
