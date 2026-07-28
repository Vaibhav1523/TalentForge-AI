import Link from "next/link";
import { UserCircle } from "lucide-react";
import {
    ADMIN_JOBS_PAGE_SIZE,
    filterAdminJobsList,
    getAdminJobsFlat,
    getAdminJobsMiniForDropdown,
    getAdminRecruitersFilterOptions,
} from "@/lib/admin/admin-data";
import {
    buildCompanyOptions,
    companyKeyForRecruiter,
    filterAdminJobsMiniByScope,
    parseAdminIdListParam,
    toCascadeRecruiterRows,
} from "@/lib/admin/admin-filter-helpers";
import { isSuperAdmin } from "@/lib/admin/is-super-admin";
import { AdminRecordActions } from "@/components/admin/AdminRecordActions";
import { AdminDataTablePagination } from "@/components/admin/AdminDataTablePagination";
import {
    ADMIN_TABLE_PAGE_SIZE_OPTIONS,
    parseAdminTablePageSize,
} from "@/lib/admin/admin-pagination";
import {
    buildAdminJobsHref,
    filterJobsByApplicantsFilter,
    parseAdminJobsAppsParam,
} from "@/lib/admin/admin-jobs-nav";
import { AdminJobsFiltersClient } from "./AdminJobsFiltersClient";

type Props = {
    searchParams?: {
        status?: string;
        /** `zero` | `some` — omit or other = all applicant counts */
        apps?: string;
        q?: string;
        sort?: string;
        dir?: string;
        companyKey?: string;
        recruiterId?: string;
        jobId?: string;
        page?: string;
        pageSize?: string;
    };
};

type SortKey = "title" | "recruiter" | "location" | "status" | "applicants" | "created";
type SortDir = "asc" | "desc";

const SORT_DEFAULTS: Record<SortKey, SortDir> = {
    title: "asc",
    recruiter: "asc",
    location: "asc",
    status: "asc",
    applicants: "desc",
    created: "desc",
};

function fmt(d: Date | string | null | undefined) {
    if (d == null) return "N/A";
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusBadge(s: string) {
    if (s === "ACTIVE") return "badge status-active";
    if (s === "DRAFT") return "badge status-draft";
    if (s === "CLOSED") return "badge status-rejected";
    return "badge status-other";
}

function jobUrl(slug: string | null, id: string) {
    return slug ? `/jobs/${slug}/${id}` : `/jobs/${id}`;
}

function sortIndicator(col: SortKey, activeSort: SortKey, activeDir: SortDir) {
    if (col !== activeSort) return " ↕";
    return activeDir === "asc" ? " ↑" : " ↓";
}

type Job = Awaited<ReturnType<typeof getAdminJobsFlat>>[number];

function sortJobs(list: Job[], sort: SortKey, dir: SortDir): Job[] {
    const m = dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
        switch (sort) {
            case "title":
                return m * (a.title ?? "").localeCompare(b.title ?? "");
            case "recruiter":
                return m * (a.recruiterName ?? "").localeCompare(b.recruiterName ?? "");
            case "location":
                return m * (a.location ?? "").localeCompare(b.location ?? "");
            case "status":
                return m * (a.status ?? "").localeCompare(b.status ?? "");
            case "applicants":
                return m * (a.applicationCount - b.applicationCount);
            case "created":
            default: {
                const ta = a.createdAt ? new Date(a.createdAt).getTime() || 0 : 0;
                const tb = b.createdAt ? new Date(b.createdAt).getTime() || 0 : 0;
                return m * (ta - tb);
            }
        }
    });
}

export default async function AdminJobsPage({ searchParams }: Props) {
    let fetchError = "";
    let jobs: Job[] = [];
    let recruiters: Awaited<ReturnType<typeof getAdminRecruitersFilterOptions>> = [];
    let jobsMini: Awaited<ReturnType<typeof getAdminJobsMiniForDropdown>> = [];

    try {
        const [flat, r, mini] = await Promise.all([
            getAdminJobsFlat(),
            getAdminRecruitersFilterOptions(),
            getAdminJobsMiniForDropdown(),
        ]);
        jobs = flat;
        recruiters = r;
        jobsMini = mini;
    } catch (err) {
        console.error("[AdminJobsPage] Failed to load jobs:", err);
        fetchError = "Failed to load jobs. Please refresh the page.";
    }

    const superAdmin = await isSuperAdmin();
    const statuses = ["ALL", "ACTIVE", "DRAFT", "CLOSED", "ARCHIVED"];
    const activeStatus = searchParams?.status ?? "ALL";
    const appsMode = parseAdminJobsAppsParam(searchParams?.apps);
    const q = (searchParams?.q ?? "").trim();
    const sort = (searchParams?.sort ?? "created") as SortKey;
    const dir = (searchParams?.dir ?? SORT_DEFAULTS[sort] ?? "desc") as SortDir;
    const companyKey = searchParams?.companyKey ?? "";
    const recruiterId = searchParams?.recruiterId ?? "";
    const jobId = searchParams?.jobId ?? "";
    const companyKeysSel = parseAdminIdListParam(companyKey);
    const recruiterIdsSel = parseAdminIdListParam(recruiterId);
    const jobIdsSel = parseAdminIdListParam(jobId);
    const pageRaw = searchParams?.page;
    const pageParsed = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
    const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;
    const pageSize = parseAdminTablePageSize(searchParams?.pageSize, ADMIN_JOBS_PAGE_SIZE);

    /** Scope + search; status tabs use this so counts match the table’s scope. */
    const scopedForTabs = filterAdminJobsList(jobs, recruiters, {
        status: "ALL",
        q,
        companyKey,
        recruiterId,
        jobId,
    });

    const statusFiltered =
        activeStatus === "ALL"
            ? scopedForTabs
            : scopedForTabs.filter((j) => j.status === activeStatus);

    const filtered = filterJobsByApplicantsFilter(statusFiltered, appsMode);

    const sorted = sortJobs(filtered, sort, dir);
    const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, pageCount);
    const pagedRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

    const counts = scopedForTabs.reduce<Record<string, number>>((acc, j) => {
        acc[j.status] = (acc[j.status] ?? 0) + 1;
        return acc;
    }, {});

    const activeInScope = scopedForTabs.filter((j) => j.status === "ACTIVE").length;

    const hasActiveFilters =
        !!q ||
        activeStatus !== "ALL" ||
        appsMode !== "all" ||
        sort !== "created" ||
        dir !== "desc" ||
        safePage > 1 ||
        pageSize !== ADMIN_JOBS_PAGE_SIZE ||
        companyKeysSel.length > 0 ||
        !!recruiterId ||
        !!jobId;

    const applicantScopeAll = statusFiltered.length;
    const applicantScopeZero = statusFiltered.filter((j) => j.applicationCount === 0).length;
    const applicantScopeWith = statusFiltered.filter((j) => j.applicationCount > 0).length;

    const statusTabLabel =
        activeStatus === "ALL"
            ? "all statuses"
            : `${activeStatus.charAt(0)}${activeStatus.slice(1).toLowerCase()} only`;
    const applicantFilterNoun =
        appsMode === "zero" ? "0 applicants" : appsMode === "some" ? "at least 1 applicant" : null;
    const clearApplicantHref = buildAdminJobsHref({
        status: activeStatus,
        apps: "all",
        q: searchParams?.q,
        sort,
        dir,
        companyKey,
        recruiterId,
        jobId,
        page: 1,
        pageSize,
    });

    const companyOptions = buildCompanyOptions(recruiters);
    const recruitersForCompany =
        companyKeysSel.length > 0
            ? recruiters.filter((r) => companyKeysSel.some((ck) => companyKeyForRecruiter(r) === ck))
            : [];
    const jobsInScope = filterAdminJobsMiniByScope(
        jobsMini,
        recruiters,
        companyKeysSel,
        recruiterIdsSel,
        [],
    );
    const orphanJobsMini = jobIdsSel
        .filter((id) => !jobsInScope.some((j) => j.id === id))
        .map((id) => jobsMini.find((j) => j.id === id))
        .filter((j): j is NonNullable<typeof j> => j != null);

    function colHref(col: SortKey) {
        const nextDir = col === sort ? (dir === "asc" ? "desc" : "asc") : SORT_DEFAULTS[col];
        return buildAdminJobsHref({
            status: activeStatus,
            apps: appsMode,
            q: searchParams?.q,
            sort: col,
            dir: nextDir,
            companyKey,
            recruiterId,
            jobId,
            page: 1,
            pageSize,
        });
    }

    const COLUMNS: { key: SortKey; label: string }[] = [
        { key: "title", label: "Job" },
        { key: "recruiter", label: "Posted By" },
        { key: "location", label: "Location" },
        { key: "status", label: "Status" },
        { key: "applicants", label: "Applicants" },
        { key: "created", label: "Created" },
    ];

    const navBase = {
        status: activeStatus,
        apps: appsMode,
        q: searchParams?.q,
        sort,
        dir,
        companyKey,
        recruiterId,
        jobId,
        pageSize,
    };
    const pageSizeHrefs = Object.fromEntries(
        ADMIN_TABLE_PAGE_SIZE_OPTIONS.map((s) => [
            s,
            buildAdminJobsHref({
                ...navBase,
                page: 1,
                pageSize: s,
            }),
        ]),
    ) as Record<number, string>;
    const firstHref = safePage > 1 ? buildAdminJobsHref({ ...navBase, page: 1 }) : null;
    const prevHref = safePage > 1 ? buildAdminJobsHref({ ...navBase, page: safePage - 1 }) : null;
    const nextHref = safePage < pageCount ? buildAdminJobsHref({ ...navBase, page: safePage + 1 }) : null;
    const lastHref = safePage < pageCount ? buildAdminJobsHref({ ...navBase, page: pageCount }) : null;

    return (
        <div className="page-shell">
            <div className="page-wrap">
                <section className="header-card">
                    <h1 className="header-title">Jobs</h1>
                    <p className="header-subtitle" style={{ marginBottom: 10 }}>
                        <strong>{statusFiltered.length}</strong> job{statusFiltered.length === 1 ? "" : "s"} match the
                        selected status (<strong>{statusTabLabel}</strong>) and your scope/search. The table below lists{" "}
                        <strong>{filtered.length}</strong> row{filtered.length === 1 ? "" : "s"}
                        {appsMode !== "all" && applicantFilterNoun ? (
                            <>
                                {" "}
                                — applicant filter: <strong>{applicantFilterNoun}</strong>
                            </>
                        ) : null}
                        .
                    </p>
                    <p className="header-subtitle admin-jobs-summary-hint" style={{ marginBottom: 0, fontSize: 12, opacity: 0.88 }}>
                        Status tabs (All, Active, …) count jobs by <strong>posting state</strong> only; they use the same
                        company/recruiter/search scope and <strong>ignore</strong> the applicant filter. Platform total{" "}
                        <strong>{jobs.length}</strong> jobs; <strong>{activeInScope}</strong> active in your current scope.
                        {superAdmin ? (
                            <>
                                {" "}
                                Use the <strong>profile icon</strong> beside an applicant count to open that job&apos;s
                                pipeline.
                            </>
                        ) : null}
                    </p>
                </section>

                {fetchError && (
                    <div className="empty-state" style={{ borderColor: "rgba(247,110,138,0.2)", color: "var(--red)" }}>
                        {fetchError}
                    </div>
                )}

                <section className="panel panel--toolbar-first">
                    <div className="toolbar">
                        <h2 className="row-title" style={{ fontSize: 15 }}>
                            Scope &amp; search
                        </h2>
                    </div>
                    <AdminJobsFiltersClient
                        companyOptions={companyOptions}
                        initialCompanyKeys={companyKeysSel}
                        initialRecruiterIds={recruiterIdsSel}
                        initialJobIds={jobIdsSel}
                        initialRecruiters={
                            companyKeysSel.length > 0
                                ? toCascadeRecruiterRows(recruitersForCompany)
                                : toCascadeRecruiterRows(recruiters)
                        }
                        initialJobs={jobsInScope}
                        orphanJobs={orphanJobsMini.map((j) => ({
                            id: j.id,
                            title: j.title,
                            company: j.company,
                        }))}
                        initialQ={q}
                        activeStatus={activeStatus}
                        appsFilter={appsMode}
                        sort={sort}
                        dir={dir}
                        pageSize={pageSize}
                        hasActiveFilters={hasActiveFilters}
                    />

                    <div className="status-tabs" style={{ marginBottom: 8 }}>
                        {statuses.map((s) => {
                            const count = s === "ALL" ? scopedForTabs.length : (counts[s] ?? 0);
                            return (
                                <Link
                                    key={s}
                                    href={buildAdminJobsHref({
                                        status: s,
                                        apps: appsMode,
                                        q: searchParams?.q,
                                        sort,
                                        dir,
                                        companyKey,
                                        recruiterId,
                                        jobId,
                                        page: 1,
                                        pageSize,
                                    })}
                                    className={`status-tab ${activeStatus === s ? "active" : ""}`}
                                >
                                    {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                                    <span className="tab-count">{count}</span>
                                </Link>
                            );
                        })}
                    </div>
                    <p
                        className="header-subtitle"
                        style={{ margin: "0 0 16px", fontSize: 12, opacity: 0.82, lineHeight: 1.45 }}
                    >
                        Tab counts = jobs in scope, split by <strong>job status</strong> (draft/active/closed). They are
                        not reduced by the applicant filter below.
                    </p>

                    <div className="admin-jobs-applicant-toolbar">
                        <div className="admin-jobs-applicant-toolbar__head">
                            <h2 className="admin-jobs-applicant-toolbar__title">Applicant filter (table only)</h2>
                            <p id="admin-jobs-applicant-filter-label" className="admin-jobs-applicant-toolbar__hint">
                                Applies on top of the status tab you selected. Counts are for those{" "}
                                <strong>{statusFiltered.length}</strong> job{statusFiltered.length === 1 ? "" : "s"}{" "}
                                only.
                            </p>
                        </div>
                        {appsMode !== "all" ? (
                            <p className="admin-jobs-active-filter" style={{ margin: "0 0 12px" }}>
                                <span className="admin-jobs-active-filter__dot" aria-hidden />
                                Narrowing table to <strong>{applicantFilterNoun}</strong>
                                {" · "}
                                <Link href={clearApplicantHref} className="admin-jobs-clear-app-filter">
                                    Show all applicant counts
                                </Link>
                            </p>
                        ) : null}
                        <div
                            className="status-tabs admin-jobs-applicant-tabs"
                            style={{ marginBottom: 0 }}
                            role="navigation"
                            aria-labelledby="admin-jobs-applicant-filter-label"
                        >
                            {(
                                [
                                    { key: "all" as const, label: "All", count: applicantScopeAll },
                                    { key: "zero" as const, label: "0 applicants", count: applicantScopeZero },
                                    { key: "some" as const, label: "Has applicants", count: applicantScopeWith },
                                ] as const
                            ).map(({ key, label, count }) => (
                                <Link
                                    key={key}
                                    href={buildAdminJobsHref({
                                        status: activeStatus,
                                        apps: key,
                                        q: searchParams?.q,
                                        sort,
                                        dir,
                                        companyKey,
                                        recruiterId,
                                        jobId,
                                        page: 1,
                                        pageSize,
                                    })}
                                    className={`status-tab ${appsMode === key ? "active" : ""}`}
                                >
                                    {label}
                                    <span className="tab-count">{count}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {sorted.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">💼</div>
                            {appsMode !== "all" && statusFiltered.length > 0 ? (
                                <>
                                    No jobs match <strong>{applicantFilterNoun}</strong> for this status and scope, but{" "}
                                    <strong>{statusFiltered.length}</strong> job{statusFiltered.length === 1 ? "" : "s"}{" "}
                                    match otherwise.
                                    <div style={{ marginTop: 14 }}>
                                        <Link href={clearApplicantHref} className="btn">
                                            Clear applicant filter
                                        </Link>
                                    </div>
                                </>
                            ) : q ? (
                                `No jobs matching filters`
                            ) : (
                                `No jobs match the current filters`
                            )}
                        </div>
                    ) : (
                        <div className="jobs-table-wrap" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
                            <table className="jobs-table">
                                <thead>
                                    <tr>
                                        {COLUMNS.map((col) => (
                                            <th key={col.key}>
                                                <Link href={colHref(col.key)} className="sortable-th">
                                                    {col.label}
                                                    <span className={`sort-arrow ${sort === col.key ? "active" : ""}`}>
                                                        {sortIndicator(col.key, sort, dir)}
                                                    </span>
                                                </Link>
                                            </th>
                                        ))}
                                        {superAdmin && <th></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedRows.map((j) => (
                                        <tr key={j.id}>
                                            <td>
                                                <Link
                                                    href={jobUrl(j.companySlug, j.id)}
                                                    className="name-link"
                                                    target="_blank"
                                                    style={{ fontWeight: 700 }}
                                                >
                                                    {j.title}
                                                </Link>
                                                <div className="row-sub">{j.company}</div>
                                            </td>
                                            <td>
                                                <Link href={`/admin/users/${j.companyId}`} className="name-link">
                                                    {j.recruiterName}
                                                </Link>
                                            </td>
                                            <td>{j.location}</td>
                                            <td>
                                                <span className={statusBadge(j.status)}>{j.status}</span>
                                            </td>
                                            <td>
                                                <div className="admin-applicants-inline">
                                                    <span className="admin-applicants-count">{j.applicationCount}</span>
                                                    {superAdmin && j.companySlug ? (
                                                        <Link
                                                            href={`/c/${j.companySlug}/candidates?jobId=${encodeURIComponent(j.id)}`}
                                                            className="admin-pipeline-icon-btn"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Open Manage Talent for this job (new tab)"
                                                            aria-label={`Manage Talent: ${j.title ?? "job"} (${j.applicationCount} applicants)`}
                                                        >
                                                            <UserCircle size={20} strokeWidth={2} aria-hidden />
                                                        </Link>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td>{fmt(j.createdAt)}</td>
                                            {superAdmin && (
                                                <td>
                                                    <AdminRecordActions
                                                        recordType="job"
                                                        recordId={j.id}
                                                        recordLabel={j.title ?? ""}
                                                        editHref={
                                                            j.companySlug ? `/c/${j.companySlug}/jobs/${j.id}/edit` : undefined
                                                        }
                                                        editFields={[
                                                            {
                                                                key: "status",
                                                                label: "Status",
                                                                type: "select",
                                                                value: j.status,
                                                                options: [
                                                                    { value: "ACTIVE", label: "Active" },
                                                                    { value: "DRAFT", label: "Draft" },
                                                                    { value: "CLOSED", label: "Closed" },
                                                                    { value: "ARCHIVED", label: "Archived" },
                                                                ],
                                                            },
                                                        ]}
                                                    />
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <AdminDataTablePagination
                                currentPage={safePage}
                                pageCount={pageCount}
                                totalItems={filtered.length}
                                pageSize={pageSize}
                                pageSizeHrefs={pageSizeHrefs}
                                firstHref={firstHref}
                                prevHref={prevHref}
                                nextHref={nextHref}
                                lastHref={lastHref}
                                ariaLabel="Jobs pagination"
                            />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
