import Link from "next/link";
import {
    ADMIN_APPLICATIONS_PAGE_SIZE,
    getAdminApplicationsList,
    getAdminJobsMiniForDropdown,
    getAdminRecruitersFilterOptions,
    resolveAdminApplicationsScope,
    type AdminApplicationsSortKey,
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
import { AdminExportExcelButton } from "@/components/admin/AdminExportExcelButton";
import { AdminDataTablePagination } from "@/components/admin/AdminDataTablePagination";
import { AdminScopeCascadeFields } from "@/components/admin/AdminScopeCascadeFields";
import {
    ADMIN_TABLE_PAGE_SIZE_OPTIONS,
    appendPageSizeParam,
    parseAdminTablePageSize,
} from "@/lib/admin/admin-pagination";

type Props = {
    searchParams?: {
        status?: string;
        q?: string;
        sort?: string;
        dir?: string;
        page?: string;
        pageSize?: string;
        companyKey?: string;
        recruiterId?: string;
        jobId?: string;
    };
};

type SortKey = AdminApplicationsSortKey;
type SortDir = "asc" | "desc";

const SORT_DEFAULTS: Record<SortKey, SortDir> = {
    candidate: "asc",
    job: "asc",
    company: "asc",
    status: "asc",
    applied: "desc",
};

function fmt(d: Date | null) {
    if (!d) return "N/A";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function statusBadge(s: string) {
    if (s === "APPLIED") return "badge status-draft";
    if (s === "SHORTLISTED" || s === "INTERVIEW") return "badge status-active";
    if (s === "HIRED") return "badge status-hired";
    if (s === "REJECTED") return "badge status-rejected";
    return "badge status-other";
}

function jobUrl(slug: string | null, id: string) {
    return slug ? `/jobs/${slug}/${id}` : `/jobs/${id}`;
}

function initials(name: string) {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";
}

function buildHref(params: {
    status?: string;
    q?: string;
    sort?: string;
    dir?: string;
    page?: number;
    pageSize?: number;
    companyKey?: string;
    recruiterId?: string;
    jobId?: string;
}) {
    const sp = new URLSearchParams();
    if (params.status && params.status !== "ALL") sp.set("status", params.status);
    if (params.q) sp.set("q", params.q);
    if (params.sort && params.sort !== "applied") {
        sp.set("sort", params.sort);
        if (params.dir) sp.set("dir", params.dir);
    } else if (params.dir && params.dir !== "desc") {
        sp.set("dir", params.dir);
    }
    if (params.page && params.page > 1) sp.set("page", String(params.page));
    if (params.companyKey) sp.set("companyKey", params.companyKey);
    if (params.recruiterId) sp.set("recruiterId", params.recruiterId);
    if (params.jobId) sp.set("jobId", params.jobId);
    const ps = params.pageSize ?? ADMIN_APPLICATIONS_PAGE_SIZE;
    appendPageSizeParam(sp, ps, ADMIN_APPLICATIONS_PAGE_SIZE);
    const qs = sp.toString();
    return `/admin/applications${qs ? `?${qs}` : ""}`;
}

function sortIndicator(col: SortKey, activeSort: SortKey, activeDir: SortDir) {
    if (col !== activeSort) return " ↕";
    return activeDir === "asc" ? " ↑" : " ↓";
}

function buildExportQuery(p: {
    status: string;
    q: string;
    sort: string;
    dir: string;
    companyKey: string;
    recruiterId: string;
    jobId: string;
}): string {
    const sp = new URLSearchParams();
    if (p.status !== "ALL") sp.set("status", p.status);
    if (p.q.trim()) sp.set("q", p.q.trim());
    if (p.sort !== "applied") sp.set("sort", p.sort);
    if (p.dir !== "desc") sp.set("dir", p.dir);
    if (p.companyKey) sp.set("companyKey", p.companyKey);
    if (p.recruiterId) sp.set("recruiterId", p.recruiterId);
    if (p.jobId) sp.set("jobId", p.jobId);
    return sp.toString();
}

export default async function AdminApplicationsPage({ searchParams }: Props) {
    let listPayload: Awaited<ReturnType<typeof getAdminApplicationsList>> | null = null;
    let fetchError = "";
    const superAdmin = await isSuperAdmin();
    const activeStatus = searchParams?.status ?? "ALL";
    const qRaw = (searchParams?.q ?? "").trim();
    const companyKey = searchParams?.companyKey ?? "";
    const recruiterId = searchParams?.recruiterId ?? "";
    const jobId = searchParams?.jobId ?? "";
    const companyKeysSel = parseAdminIdListParam(companyKey);
    const recruiterIdsSel = parseAdminIdListParam(recruiterId);
    const jobIdsSel = parseAdminIdListParam(jobId);
    const VALID_SORT_KEYS: Set<string> = new Set(["candidate", "job", "company", "status", "applied"]);
    const sort: SortKey = VALID_SORT_KEYS.has(searchParams?.sort ?? "")
        ? (searchParams!.sort as SortKey)
        : "applied";
    const rawDir = searchParams?.dir;
    const dir: SortDir = rawDir === "asc" || rawDir === "desc" ? rawDir : (SORT_DEFAULTS[sort] ?? "desc");
    const pageRaw = searchParams?.page;
    const pageParsed = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
    const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;
    const pageSize = parseAdminTablePageSize(searchParams?.pageSize, ADMIN_APPLICATIONS_PAGE_SIZE);

    const recruiters = await getAdminRecruitersFilterOptions();
    const jobsMini = await getAdminJobsMiniForDropdown();
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

    const { applicationScopeOr, emptyCompanyScope } = resolveAdminApplicationsScope(
        recruiters,
        companyKey,
        recruiterId,
    );

    try {
        listPayload = await getAdminApplicationsList({
            page,
            pageSize,
            status: activeStatus,
            q: qRaw,
            sort,
            dir,
            applicationScopeOr,
            jobIds: jobIdsSel,
            emptyCompanyScope,
        });
    } catch (err) {
        console.error("[AdminApplicationsPage] Failed to load applications:", err);
        fetchError = "Failed to load applications. Please refresh the page.";
    }

    const applications = listPayload?.applications ?? [];
    const totalFiltered = listPayload?.totalFiltered ?? 0;
    const totalAll = listPayload?.totalAll ?? 0;
    const scopedTotal = listPayload?.scopedTotal ?? totalAll;
    const counts = listPayload?.countsByStatus ?? {};
    const pageCount = listPayload?.pageCount ?? 1;
    const currentPage = listPayload?.page ?? page;
    const effectivePageSize = listPayload?.pageSize ?? pageSize;

    const statuses = ["ALL", "APPLIED", "SHORTLISTED", "INTERVIEW", "HIRED", "REJECTED"];
    const hasActiveFilters =
        qRaw ||
        activeStatus !== "ALL" ||
        sort !== "applied" ||
        dir !== "desc" ||
        currentPage > 1 ||
        effectivePageSize !== ADMIN_APPLICATIONS_PAGE_SIZE ||
        companyKeysSel.length > 0 ||
        !!recruiterId ||
        !!jobId;

    function colHref(col: SortKey) {
        const nextDir = col === sort ? (dir === "asc" ? "desc" : "asc") : SORT_DEFAULTS[col];
        return buildHref({
            status: activeStatus,
            q: searchParams?.q,
            sort: col,
            dir: nextDir,
            page: 1,
            pageSize: effectivePageSize,
            companyKey,
            recruiterId,
            jobId,
        });
    }

    function pageHref(p: number) {
        return buildHref({
            status: activeStatus,
            q: searchParams?.q,
            sort,
            dir,
            page: p > 1 ? p : undefined,
            pageSize: effectivePageSize,
            companyKey,
            recruiterId,
            jobId,
        });
    }

    const navBaseApp = {
        status: activeStatus,
        q: searchParams?.q,
        sort,
        dir,
        companyKey,
        recruiterId,
        jobId,
        pageSize: effectivePageSize,
    };
    const pageSizeHrefsApp = Object.fromEntries(
        ADMIN_TABLE_PAGE_SIZE_OPTIONS.map((s) => [
            s,
            buildHref({
                ...navBaseApp,
                page: 1,
                pageSize: s,
            }),
        ]),
    ) as Record<number, string>;
    const firstHrefApp = currentPage > 1 ? pageHref(1) : null;
    const prevHrefApp = currentPage > 1 ? pageHref(currentPage - 1) : null;
    const nextHrefApp = currentPage < pageCount ? pageHref(currentPage + 1) : null;
    const lastHrefApp = currentPage < pageCount ? pageHref(pageCount) : null;

    const exportQuery = buildExportQuery({
        status: activeStatus,
        q: qRaw,
        sort,
        dir,
        companyKey,
        recruiterId,
        jobId,
    });

    const COLUMNS: { key: SortKey | "resume"; label: string; sortable: boolean }[] = [
        { key: "candidate", label: "Candidate", sortable: true },
        { key: "job", label: "Job", sortable: true },
        { key: "company", label: "Company", sortable: true },
        { key: "status", label: "Status", sortable: true },
        { key: "applied", label: "Applied", sortable: true },
        { key: "resume", label: "Resume", sortable: false },
    ];

    return (
        <div className="page-shell">
            <div className="page-wrap">
                <section className="header-card">
                    <h1 className="header-title">Applications</h1>
                    <p className="header-subtitle">
                        <strong>{totalFiltered}</strong> application{totalFiltered === 1 ? "" : "s"} with the current
                        status tab
                        {activeStatus !== "ALL" ? ` (${activeStatus})` : ""}. Scope (company/recruiter/job/search):{" "}
                        <strong>{scopedTotal}</strong> (tab counts use this scope). Platform total{" "}
                        <strong>{totalAll}</strong>.
                    </p>
                </section>

                {fetchError && (
                    <div className="empty-state" style={{ borderColor: "rgba(247,110,138,0.2)", color: "var(--red)" }}>
                        {fetchError}
                    </div>
                )}

                {!fetchError && (
                    <section className="panel panel--toolbar-first">
                        <div className="toolbar">
                            <h2 className="row-title" style={{ fontSize: 15 }}>
                                Scope &amp; search
                            </h2>
                        </div>
                        <form
                            key={`${companyKey}|${recruiterId}|${jobId}|${qRaw}|${activeStatus}|${effectivePageSize}`}
                            method="GET"
                            className="filter-form"
                            style={{ marginBottom: 12 }}
                        >
                            {activeStatus !== "ALL" && <input type="hidden" name="status" value={activeStatus} />}
                            {sort !== "applied" && <input type="hidden" name="sort" value={sort} />}
                            {dir !== "desc" && <input type="hidden" name="dir" value={dir} />}
                            <input type="hidden" name="page" value="1" />
                            {effectivePageSize !== ADMIN_APPLICATIONS_PAGE_SIZE && (
                                <input type="hidden" name="pageSize" value={String(effectivePageSize)} />
                            )}
                            <div
                                style={{
                                    display: "grid",
                                    gap: 12,
                                    marginTop: 12,
                                }}
                            >
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <AdminScopeCascadeFields
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
                                        companyLabel="1. Companies"
                                        recruiterLabel="2. Recruiters"
                                        jobLabel="3. Jobs (optional)"
                                        jobPlaceholderWhenRecruiterSelected="All applications for selected recruiter(s)’ jobs"
                                    />
                                </div>
                                <div className="filter-field" style={{ gridColumn: "1 / -1" }}>
                                    <label className="filter-label">Search</label>
                                    <input
                                        name="q"
                                        defaultValue={searchParams?.q ?? ""}
                                        placeholder="Candidate, job title, company…"
                                        className="control-input"
                                    />
                                </div>
                            </div>
                            <div
                                className="filter-actions"
                                style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}
                            >
                                <button type="submit" className="btn primary">
                                    Apply filters
                                </button>
                                {hasActiveFilters && (
                                    <Link href="/admin/applications" className="btn">
                                        Clear all
                                    </Link>
                                )}
                                <AdminExportExcelButton
                                    label="Download Excel"
                                    endpoint="/api/admin/applications/export"
                                    query={exportQuery}
                                    filenamePrefix="admin-applications"
                                    sheetName="Applications"
                                    hyperlinkColumnHeaders={["Resume viewer link", "Job page"]}
                                />
                            </div>
                        </form>

                        <div className="status-tabs" style={{ marginBottom: 16 }}>
                            {statuses.map((s) => {
                                const count = s === "ALL" ? scopedTotal : (counts[s] ?? 0);
                                return (
                                    <Link
                                        key={s}
                                        href={buildHref({
                                            status: s,
                                            q: searchParams?.q,
                                            sort,
                                            dir,
                                            companyKey,
                                            recruiterId,
                                            jobId,
                                            page: 1,
                                            pageSize: effectivePageSize,
                                        })}
                                        className={`status-tab ${activeStatus === s ? "active" : ""}`}
                                    >
                                        {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                                        <span className="tab-count">{count}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {totalFiltered === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📋</div>
                                {qRaw
                                    ? `No applications matching filters`
                                    : `No applications match the current filters`}
                            </div>
                        ) : (
                            <div className="jobs-table-wrap" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
                                <table className="jobs-table">
                                    <thead>
                                        <tr>
                                            {COLUMNS.map((col) => (
                                                <th key={col.key}>
                                                    {col.sortable ? (
                                                        <Link href={colHref(col.key as SortKey)} className="sortable-th">
                                                            {col.label}
                                                            <span
                                                                className={`sort-arrow ${sort === col.key ? "active" : ""}`}
                                                            >
                                                                {sortIndicator(col.key as SortKey, sort, dir)}
                                                            </span>
                                                        </Link>
                                                    ) : (
                                                        col.label
                                                    )}
                                                </th>
                                            ))}
                                            {superAdmin && <th></th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {applications.map((a) => (
                                            <tr key={a.id}>
                                                <td>
                                                    <div className="user-cell">
                                                        <div className="avatar-sm purple">{initials(a.candidateName)}</div>
                                                        <div className="user-cell-info">
                                                            <Link
                                                                href={`/admin/users/${a.candidateId}`}
                                                                className="name-link"
                                                                style={{ fontWeight: 700, fontSize: 13 }}
                                                            >
                                                                {a.candidateName}
                                                            </Link>
                                                            <div className="row-sub">{a.candidateEmail}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <Link
                                                        href={jobUrl(a.companySlug, a.jobId)}
                                                        className="name-link"
                                                        target="_blank"
                                                        style={{ fontWeight: 600 }}
                                                    >
                                                        {a.jobTitle}
                                                    </Link>
                                                </td>
                                                <td>{a.company}</td>
                                                <td>
                                                    <span className={statusBadge(a.status)}>{a.status}</span>
                                                </td>
                                                <td>{fmt(a.appliedAt)}</td>
                                                <td>
                                                    {a.resumeUrl ? (
                                                        <a
                                                            href={`/api/resume/view?url=${encodeURIComponent(a.resumeUrl)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="name-link"
                                                            style={{ fontWeight: 600 }}
                                                        >
                                                            View ↗
                                                        </a>
                                                    ) : (
                                                        <span className="muted">—</span>
                                                    )}
                                                </td>
                                                {superAdmin && (
                                                    <td>
                                                        <AdminRecordActions
                                                            recordType="application"
                                                            recordId={a.id}
                                                            recordLabel={`${a.candidateName}'s application`}
                                                            editFields={[
                                                                {
                                                                    key: "status",
                                                                    label: "Status",
                                                                    type: "select",
                                                                    value: a.status,
                                                                    options: [
                                                                        { value: "APPLIED", label: "Applied" },
                                                                        { value: "SHORTLISTED", label: "Shortlisted" },
                                                                        { value: "INTERVIEW", label: "Interview" },
                                                                        { value: "HIRED", label: "Hired" },
                                                                        { value: "REJECTED", label: "Rejected" },
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
                                    currentPage={currentPage}
                                    pageCount={pageCount}
                                    totalItems={totalFiltered}
                                    pageSize={effectivePageSize}
                                    pageSizeHrefs={pageSizeHrefsApp}
                                    firstHref={firstHrefApp}
                                    prevHref={prevHrefApp}
                                    nextHref={nextHrefApp}
                                    lastHref={lastHrefApp}
                                    ariaLabel="Applications pagination"
                                />
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
