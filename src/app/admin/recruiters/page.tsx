import Link from "next/link";
import {
    ADMIN_RECRUITERS_PAGE_SIZE,
    getAdminRecruiterSummariesFull,
    type RecruiterSummary,
} from "@/lib/admin/admin-data";
import {
    buildCompanyOptions,
    companyKeyForRecruiter,
    type AdminRecruiterFilterRow,
} from "@/lib/admin/admin-filter-helpers";
import { isSuperAdmin } from "@/lib/admin/is-super-admin";
import { AdminRecordActions } from "@/components/admin/AdminRecordActions";
import { AdminDataTablePagination } from "@/components/admin/AdminDataTablePagination";
import {
    ADMIN_TABLE_PAGE_SIZE_OPTIONS,
    appendPageSizeParam,
    parseAdminTablePageSize,
} from "@/lib/admin/admin-pagination";

export const dynamic = "force-dynamic";

type Props = {
    searchParams?: {
        q?: string;
        hasJobs?: string;
        sort?: string;
        companyKey?: string;
        page?: string;
        pageSize?: string;
    };
};

function fmt(d: Date | null) {
    if (!d) return "N/A";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function statusBadge(s: string) {
    if (s === "ACTIVE") return "badge status-active";
    if (s === "DRAFT") return "badge status-draft";
    return "badge status-other";
}

function jobUrl(slug: string | null, id: string) {
    return slug ? `/jobs/${slug}/${id}` : `/jobs/${id}`;
}

function initials(name: string) {
    return (
        name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?"
    );
}

const SORT_OPTIONS = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "name-az", label: "Name A → Z" },
    { value: "name-za", label: "Name Z → A" },
    { value: "most-jobs", label: "Most Jobs" },
    { value: "most-apps", label: "Most Applications" },
    { value: "recent-post", label: "Recent Post" },
] as const;

const FILTER_OPTIONS = [
    { value: "all", label: "All Recruiters" },
    { value: "with-jobs", label: "With Jobs" },
    { value: "no-jobs", label: "No Jobs" },
    { value: "with-apps", label: "With Applications" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

function summaryToFilterRow(r: RecruiterSummary): AdminRecruiterFilterRow {
    return {
        id: r.id,
        name: r.name,
        companyName: r.companyName ?? "",
        companySlug: r.companySlug,
        organizationId: r.organizationId,
        organizationSlug: r.organizationSlug,
    };
}

function buildHref(
    q: string,
    hasJobs: string,
    sort: string,
    companyKey: string,
    page?: number,
    pageSize?: number,
) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (hasJobs && hasJobs !== "all") params.set("hasJobs", hasJobs);
    if (sort && sort !== "newest") params.set("sort", sort);
    if (companyKey.trim()) params.set("companyKey", companyKey.trim());
    if (page && page > 1) params.set("page", String(page));
    const ps = pageSize ?? ADMIN_RECRUITERS_PAGE_SIZE;
    appendPageSizeParam(params, ps, ADMIN_RECRUITERS_PAGE_SIZE);
    const qs = params.toString();
    return `/admin/recruiters${qs ? `?${qs}` : ""}`;
}

function sortRecruiters(list: RecruiterSummary[], sort: SortKey) {
    return [...list].sort((a, b) => {
        switch (sort) {
            case "oldest":
                return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
            case "name-az":
                return a.name.localeCompare(b.name);
            case "name-za":
                return b.name.localeCompare(a.name);
            case "most-jobs":
                return b.totalJobs - a.totalJobs;
            case "most-apps":
                return b.totalApplications - a.totalApplications;
            case "recent-post":
                return (b.latestJobAt?.getTime() ?? 0) - (a.latestJobAt?.getTime() ?? 0);
            case "newest":
            default:
                return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
        }
    });
}

function applyFilters(
    recruiters: RecruiterSummary[],
    q: string,
    hasJobs: string,
    companyKey: string,
) {
    const qLower = q.trim().toLowerCase();
    return recruiters.filter((r) => {
        if (companyKey.trim()) {
            if (companyKeyForRecruiter(summaryToFilterRow(r)) !== companyKey.trim()) return false;
        }
        if (qLower) {
            const match =
                r.name.toLowerCase().includes(qLower) ||
                r.email.toLowerCase().includes(qLower) ||
                (r.companyName ?? "").toLowerCase().includes(qLower);
            if (!match) return false;
        }
        if (hasJobs === "with-jobs" && r.totalJobs === 0) return false;
        if (hasJobs === "no-jobs" && r.totalJobs > 0) return false;
        if (hasJobs === "with-apps" && r.totalApplications === 0) return false;
        return true;
    });
}

export default async function AdminRecruitersPage({ searchParams }: Props) {
    let recruiters: RecruiterSummary[] = [];
    let fetchError = "";
    try {
        recruiters = await getAdminRecruiterSummariesFull();
    } catch (err) {
        console.error("[AdminRecruitersPage] Failed to load recruiters:", err);
        fetchError = "Failed to load recruiters. Please refresh the page.";
    }

    const q = (searchParams?.q ?? "").trim();
    const hasJobs = searchParams?.hasJobs ?? "all";
    const companyKey = (searchParams?.companyKey ?? "").trim();
    const VALID_SORT_KEYS: Set<string> = new Set(SORT_OPTIONS.map((o) => o.value));
    const rawSort = searchParams?.sort ?? "newest";
    const sort: SortKey = VALID_SORT_KEYS.has(rawSort) ? (rawSort as SortKey) : "newest";
    const pageRaw = searchParams?.page;
    const pageParsed = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
    const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;
    const pageSize = parseAdminTablePageSize(searchParams?.pageSize, ADMIN_RECRUITERS_PAGE_SIZE);

    const filterRows = recruiters.map(summaryToFilterRow);
    const companyOptions = buildCompanyOptions(filterRows);

    const inCompanyScope = companyKey
        ? recruiters.filter((r) => companyKeyForRecruiter(summaryToFilterRow(r)) === companyKey)
        : recruiters;

    const filtered = sortRecruiters(applyFilters(recruiters, q, hasJobs, companyKey), sort);
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, pageCount);
    const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const superAdmin = await isSuperAdmin();
    const totalJobsInView = filtered.reduce((s, r) => s + r.totalJobs, 0);
    const totalAppsInView = filtered.reduce((s, r) => s + r.totalApplications, 0);
    const totalJobsCompany = inCompanyScope.reduce((s, r) => s + r.totalJobs, 0);
    const totalAppsCompany = inCompanyScope.reduce((s, r) => s + r.totalApplications, 0);

    const hasActiveFilters =
        q ||
        hasJobs !== "all" ||
        sort !== "newest" ||
        !!companyKey ||
        safePage > 1 ||
        pageSize !== ADMIN_RECRUITERS_PAGE_SIZE;

    const pageSizeHrefsRec = Object.fromEntries(
        ADMIN_TABLE_PAGE_SIZE_OPTIONS.map((s) => [
            s,
            buildHref(q, hasJobs, sort, companyKey, 1, s),
        ]),
    ) as Record<number, string>;
    const firstHrefRec = safePage > 1 ? buildHref(q, hasJobs, sort, companyKey, 1, pageSize) : null;
    const prevHrefRec = safePage > 1 ? buildHref(q, hasJobs, sort, companyKey, safePage - 1, pageSize) : null;
    const nextHrefRec =
        safePage < pageCount ? buildHref(q, hasJobs, sort, companyKey, safePage + 1, pageSize) : null;
    const lastHrefRec =
        safePage < pageCount ? buildHref(q, hasJobs, sort, companyKey, pageCount, pageSize) : null;

    return (
        <div className="page-shell">
            <div className="page-wrap">
                <section className="header-card">
                    <h1 className="header-title">Recruiters</h1>
                    <p className="header-subtitle">
                        <strong>{filtered.length}</strong> recruiter{filtered.length === 1 ? "" : "s"} match filters
                        {companyKey ? (
                            <>
                                {" "}
                                · <strong>{inCompanyScope.length}</strong> in selected company
                            </>
                        ) : null}
                        . Totals for this list: <strong>{totalJobsInView}</strong> jobs posted,{" "}
                        <strong>{totalAppsInView}</strong> applications
                        {companyKey ? (
                            <>
                                {" "}
                                · Company scope (before search/job filters):{" "}
                                <strong>{totalJobsCompany}</strong> jobs, <strong>{totalAppsCompany}</strong> apps
                            </>
                        ) : null}
                        . Platform total <strong>{recruiters.length}</strong> recruiters.
                    </p>
                </section>

                <section className="panel panel--toolbar-first">
                    <div className="toolbar">
                        <h2 className="row-title" style={{ fontSize: 15 }}>
                            Filters &amp; scope
                        </h2>
                    </div>
                    <form
                        key={`${q}|${hasJobs}|${sort}|${companyKey}|${pageSize}`}
                        method="GET"
                        className="filter-form"
                        style={{ marginBottom: 12 }}
                    >
                    {pageSize !== ADMIN_RECRUITERS_PAGE_SIZE && (
                        <input type="hidden" name="pageSize" value={String(pageSize)} />
                    )}
                    <div
                        style={{
                            display: "grid",
                            gap: 12,
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            alignItems: "end",
                        }}
                    >
                        <div className="filter-field">
                            <label htmlFor="companyKey" className="filter-label">
                                Company
                            </label>
                            <select
                                id="companyKey"
                                name="companyKey"
                                className="control-input"
                                defaultValue={companyKey}
                            >
                                <option value="">All companies</option>
                                {companyOptions.map((c) => (
                                    <option key={c.key} value={c.key}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-field" style={{ gridColumn: "span 2" }}>
                            <label htmlFor="q" className="filter-label">
                                Search
                            </label>
                            <input
                                id="q"
                                name="q"
                                defaultValue={searchParams?.q ?? ""}
                                placeholder="Name, email, company…"
                                className="control-input"
                            />
                        </div>
                        <div className="filter-field">
                            <label htmlFor="hasJobs" className="filter-label">
                                Filter
                            </label>
                            <select id="hasJobs" name="hasJobs" defaultValue={hasJobs} className="control-input">
                                {FILTER_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-field">
                            <label htmlFor="sort" className="filter-label">
                                Sort by
                            </label>
                            <select id="sort" name="sort" defaultValue={sort} className="control-input">
                                {SORT_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-actions" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button type="submit" className="btn primary">
                                Search
                            </button>
                            {hasActiveFilters && <Link href="/admin/recruiters" className="btn">Clear</Link>}
                        </div>
                    </div>
                    </form>
                </section>

                {fetchError ? (
                    <div className="empty-state" style={{ borderColor: "rgba(247,110,138,0.2)", color: "var(--red)" }}>
                        {fetchError}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🏢</div>
                        {hasActiveFilters ? "No recruiters match your filters" : "No recruiters have signed up yet"}
                    </div>
                ) : (
                    <>
                        <div className="list" style={{ gap: 16 }}>
                            {paged.map((r) => (
                                <section key={r.id} className="panel">
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 14,
                                            marginBottom: 16,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <div className="avatar-sm">{initials(r.name)}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <Link
                                                    href={`/admin/users/${r.id}`}
                                                    className="name-link"
                                                    style={{ fontSize: 15, fontWeight: 750 }}
                                                >
                                                    {r.name}
                                                </Link>
                                                {r.companyName && (
                                                    <span className="pill" style={{ padding: "2px 8px", fontSize: 10.5 }}>
                                                        {r.companyName}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="row-sub" style={{ marginTop: 1 }}>
                                                {r.email}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                            {(r.organizationSlug || r.companySlug) && (
                                                <Link
                                                    href={`/c/${r.organizationSlug || r.companySlug}`}
                                                    className="btn"
                                                    target="_blank"
                                                    style={{ fontSize: 11.5, padding: "5px 10px" }}
                                                >
                                                    Dashboard ↗
                                                </Link>
                                            )}
                                            <Link
                                                href={`/admin/users/${r.id}`}
                                                className="btn"
                                                style={{ fontSize: 11.5, padding: "5px 10px" }}
                                            >
                                                Profile →
                                            </Link>
                                            {superAdmin && (
                                                <AdminRecordActions
                                                    recordType="user"
                                                    recordId={r.id}
                                                    recordLabel={r.name}
                                                    editFields={[
                                                        {
                                                            key: "isAdmin",
                                                            label: "Admin",
                                                            type: "checkbox",
                                                            value: r.isAdmin ?? false,
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        className="stats-grid"
                                        style={{ marginBottom: (r.jobs?.length ?? 0) > 0 ? 14 : 0 }}
                                    >
                                        <div className="stat-card" style={{ padding: 14 }}>
                                            <div className="stat-label">Total Jobs</div>
                                            <div className="stat-value" style={{ fontSize: 22 }}>
                                                {r.totalJobs}
                                            </div>
                                        </div>
                                        <div className="stat-card" style={{ padding: 14 }}>
                                            <div className="stat-label">Active</div>
                                            <div className="stat-value" style={{ fontSize: 22 }}>
                                                {r.activeJobs}
                                            </div>
                                        </div>
                                        <div className="stat-card" style={{ padding: 14 }}>
                                            <div className="stat-label">Applications</div>
                                            <div className="stat-value" style={{ fontSize: 22 }}>
                                                {r.totalApplications}
                                            </div>
                                        </div>
                                        <div className="stat-card" style={{ padding: 14 }}>
                                            <div className="stat-label">Last Post</div>
                                            <div className="stat-value" style={{ fontSize: 12, marginTop: 6 }}>
                                                {fmt(r.latestJobAt)}
                                            </div>
                                        </div>
                                    </div>

                                    {(r.jobs?.length ?? 0) > 0 && (
                                        <div
                                            className="jobs-table-wrap"
                                            style={{
                                                marginTop: 0,
                                                borderTop: "1px solid rgba(255,255,255,0.05)",
                                                paddingTop: 12,
                                            }}
                                        >
                                            <table className="jobs-table">
                                                <thead>
                                                    <tr>
                                                        <th>Job</th>
                                                        <th>Status</th>
                                                        <th>Applicants</th>
                                                        <th>Created</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {r.jobs.map((j) => (
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
                                                            </td>
                                                            <td>
                                                                <span className={statusBadge(j.status)}>{j.status}</span>
                                                            </td>
                                                            <td style={{ fontWeight: 700 }}>{j.applicationCount}</td>
                                                            <td>{fmt(j.createdAt)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            ))}
                        </div>
                        <AdminDataTablePagination
                            currentPage={safePage}
                            pageCount={pageCount}
                            totalItems={filtered.length}
                            pageSize={pageSize}
                            pageSizeHrefs={pageSizeHrefsRec}
                            firstHref={firstHrefRec}
                            prevHref={prevHrefRec}
                            nextHref={nextHrefRec}
                            lastHref={lastHrefRec}
                            ariaLabel="Recruiters pagination"
                        />
                    </>
                )}
            </div>
        </div>
    );
}
