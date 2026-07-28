import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/require-admin";
import {
    getAdminApplicationsExportRows,
    getAdminRecruitersFilterOptions,
    resolveAdminApplicationsScope,
    type AdminApplicationsSortKey,
} from "@/lib/admin/admin-data";
import { getSiteOriginFromRequest } from "@/lib/admin/site-origin";
import { parseAdminIdListParam } from "@/lib/admin/admin-filter-helpers";
import { parseResumeObjectNameFromUrl } from "@/lib/gcs";

function fmt(d: Date | null) {
    if (!d) return "";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(d);
}

const SORT_KEYS = new Set(["candidate", "job", "company", "status", "applied"]);

function buildJobPageUrl(origin: string, companySlug: string | null, jobId: string): string {
    const path = companySlug ? `/jobs/${companySlug}/${jobId}` : `/jobs/${jobId}`;
    return `${origin}${path}`;
}

function buildResumeViewerUrl(origin: string, rawResumeUrl: string): string {
    const t = rawResumeUrl.trim();
    if (!t) return "";
    return `${origin}/api/resume/view?url=${encodeURIComponent(t)}`;
}

export async function GET(req: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") ?? "ALL";
    const q = sp.get("q") ?? "";
    const recruiterId = sp.get("recruiterId") ?? "";
    const companyKey = sp.get("companyKey") ?? "";
    const jobId = sp.get("jobId") ?? "";
    const sortRaw = sp.get("sort") ?? "applied";
    const sort: AdminApplicationsSortKey = SORT_KEYS.has(sortRaw) ? (sortRaw as AdminApplicationsSortKey) : "applied";
    const dir = sp.get("dir") === "asc" ? "asc" : "desc";

    try {
        const recruiters = await getAdminRecruitersFilterOptions();
        const { applicationScopeOr, emptyCompanyScope } = resolveAdminApplicationsScope(
            recruiters,
            companyKey,
            recruiterId,
        );
        const jobIdsSel = parseAdminIdListParam(jobId);

        if (emptyCompanyScope) {
            return NextResponse.json({ rows: [] });
        }

        const apps = await getAdminApplicationsExportRows({
            status,
            q,
            applicationScopeOr,
            jobIds: jobIdsSel,
            sort,
            dir,
            take: 20000,
        });
        const origin = getSiteOriginFromRequest(req);
        const rows = apps.map((a) => {
            const resumePath = parseResumeObjectNameFromUrl(a.resumeUrl) ?? "";
            const resumeViewer = buildResumeViewerUrl(origin, a.resumeUrl);
            const jobPage = buildJobPageUrl(origin, a.companySlug, a.jobId);
            return {
                "Candidate name": a.candidateName,
                Email: a.candidateEmail,
                Phone: a.candidatePhone,
                Skills: a.candidateSkills,
                "Current CTC (profile)": a.candidateProfileCurrentCTC,
                "Expected CTC (profile)": a.candidateProfileExpectedCTC,
                "Notice period (profile)": a.candidateProfileNoticePeriod,
                City: a.candidateCity,
                State: a.candidateState,
                Country: a.candidateCountry,
                LinkedIn: a.candidateLinkedin,
                GitHub: a.candidateGithub,
                Twitter: a.candidateTwitter,
                Job: a.jobTitle,
                Company: a.company,
                "Job page": jobPage,
                Status: a.status,
                Applied: fmt(a.appliedAt),
                Motivation: a.motivation,
                "Application city": a.applicationCity,
                "Current CTC (application)": a.currentCTC,
                "Expected CTC (application)": a.expectedCTC,
                "Current currency (application)": a.currentCurrency,
                "Expected currency (application)": a.expectedCurrency,
                "Notice period (application)": a.noticePeriod,
                "Resume storage path": resumePath,
                "Resume viewer link": resumeViewer,
                "Application id": a.id,
                "Candidate id": a.candidateId,
                "Job id": a.jobId,
            };
        });
        return NextResponse.json({ rows });
    } catch (err) {
        console.error("[admin/applications/export]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
