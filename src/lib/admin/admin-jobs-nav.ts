import { appendPageSizeParam } from "@/lib/admin/admin-pagination";

/** Default jobs table page size — keep in sync with `ADMIN_JOBS_PAGE_SIZE` in `admin-data.ts`. */
const ADMIN_JOBS_PAGE_DEFAULT = 50;

/** Sub-filter on application count (admin Jobs table + export). */
export type AdminJobsAppsFilter = "all" | "zero" | "some";

export function parseAdminJobsAppsParam(raw: string | undefined | null): AdminJobsAppsFilter {
    if (raw === "zero") return "zero";
    if (raw === "some") return "some";
    return "all";
}

export function filterJobsByApplicantsFilter<T extends { applicationCount: number }>(
    jobs: T[],
    apps: AdminJobsAppsFilter,
): T[] {
    if (apps === "zero") return jobs.filter((j) => j.applicationCount === 0);
    if (apps === "some") return jobs.filter((j) => j.applicationCount > 0);
    return jobs;
}

/** Build `/admin/jobs` URL with query string from filter state. */
export function buildAdminJobsHref(params: {
    status?: string;
    /** Narrow rows by applicant count; omit or `all` leaves query unset. */
    apps?: AdminJobsAppsFilter;
    q?: string;
    sort?: string;
    dir?: string;
    companyKey?: string;
    recruiterId?: string;
    jobId?: string;
    page?: number;
    pageSize?: number;
}): string {
    const sp = new URLSearchParams();
    if (params.status && params.status !== "ALL") sp.set("status", params.status);
    if (params.apps && params.apps !== "all") sp.set("apps", params.apps);
    if (params.q) sp.set("q", params.q);
    if (params.sort && params.sort !== "created") {
        sp.set("sort", params.sort);
        if (params.dir) sp.set("dir", params.dir);
    } else if (params.dir && params.dir !== "desc") {
        sp.set("dir", params.dir);
    }
    if (params.companyKey) sp.set("companyKey", params.companyKey);
    if (params.recruiterId) sp.set("recruiterId", params.recruiterId);
    if (params.jobId) sp.set("jobId", params.jobId);
    if (params.page && params.page > 1) sp.set("page", String(params.page));
    const ps = params.pageSize ?? ADMIN_JOBS_PAGE_DEFAULT;
    appendPageSizeParam(sp, ps, ADMIN_JOBS_PAGE_DEFAULT);
    const qs = sp.toString();
    return `/admin/jobs${qs ? `?${qs}` : ""}`;
}

/** Query string for `/api/admin/jobs/export`. */
export function buildAdminJobsExportQuery(p: {
    status: string;
    apps?: AdminJobsAppsFilter;
    q: string;
    sort: string;
    dir: string;
    companyKey: string;
    recruiterId: string;
    jobId: string;
}): string {
    const sp = new URLSearchParams();
    if (p.status !== "ALL") sp.set("status", p.status);
    if (p.apps && p.apps !== "all") sp.set("apps", p.apps);
    if (p.q.trim()) sp.set("q", p.q.trim());
    if (p.companyKey) sp.set("companyKey", p.companyKey);
    if (p.recruiterId) sp.set("recruiterId", p.recruiterId);
    if (p.jobId) sp.set("jobId", p.jobId);
    return sp.toString();
}
