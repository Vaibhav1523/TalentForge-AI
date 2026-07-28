import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/require-admin";
import {
    filterAdminJobsList,
    getAdminJobsFlat,
    getAdminRecruitersFilterOptions,
} from "@/lib/admin/admin-data";
import { filterJobsByApplicantsFilter, parseAdminJobsAppsParam } from "@/lib/admin/admin-jobs-nav";

function fmt(d: Date | null) {
    if (!d) return "";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(d);
}

export async function GET(req: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") ?? "ALL";
    const apps = parseAdminJobsAppsParam(sp.get("apps"));
    const q = sp.get("q") ?? "";
    const companyKey = sp.get("companyKey") ?? "";
    const recruiterId = sp.get("recruiterId") ?? "";
    const jobId = sp.get("jobId") ?? "";

    try {
        const [jobs, recruiters] = await Promise.all([getAdminJobsFlat(), getAdminRecruitersFilterOptions()]);
        const filtered = filterAdminJobsList(jobs, recruiters, {
            status,
            q,
            companyKey,
            recruiterId,
            jobId,
        });
        const rows = filterJobsByApplicantsFilter(filtered, apps).map((j) => ({
            Title: j.title,
            Company: j.company,
            Location: j.location,
            Status: j.status,
            "Posted by": j.recruiterName,
            "Company user id": j.companyId,
            Applicants: j.applicationCount,
            Created: fmt(j.createdAt),
            "Job id": j.id,
            "Public slug": j.companySlug ?? "",
        }));
        return NextResponse.json({ rows });
    } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        const stackPreview = e.stack?.split("\n").slice(0, 4).join(" ← ") ?? "";
        console.error("[admin/jobs/export]", {
            name: e.name,
            message: e.message,
            stackPreview: stackPreview.slice(0, 800),
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
