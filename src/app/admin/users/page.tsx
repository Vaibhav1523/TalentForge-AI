import Link from "next/link";
import {
    ADMIN_USERS_PAGE_SIZE,
    getAdminUsersGlobalStats,
    getAdminUsersList,
    getAdminRecruitersFilterOptions,
    type AdminUsersRoleFilter,
    type AdminUsersSortKey,
} from "@/lib/admin/admin-data";
import {
    buildCompanyOptions,
    companyKeyForRecruiter,
    parseAdminIdListParam,
    recruiterIdsForCompanyKeys,
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
        q?: string;
        from?: string;
        to?: string;
        sort?: string;
        dir?: string;
        page?: string;
        pageSize?: string;
        role?: string;
        companyKey?: string;
        recruiterId?: string;
    };
};

type SortKey = AdminUsersSortKey;
type SortDir = "asc" | "desc";

const SORT_DEFAULTS: Record<SortKey, SortDir> = {
    name: "asc",
    location: "asc",
    applications: "desc",
    joined: "desc",
};

const VALID_SORT: Set<string> = new Set(["name", "location", "applications", "joined"]);
const VALID_ROLE = new Set<AdminUsersRoleFilter>(["ALL", "CANDIDATE", "RECRUITER"]);

function fmt(d: Date | null) {
    if (!d) return "N/A";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function norm(v?: string) {
    return (v ?? "").trim();
}

function parseStart(v?: string): Date | null {
    if (!v) return null;
    const d = new Date(`${v}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function parseEnd(v?: string): Date | null {
    if (!v) return null;
    const d = new Date(`${v}T23:59:59.999`);
    return Number.isNaN(d.getTime()) ? null : d;
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

function sortIndicator(col: SortKey, activeSort: SortKey, activeDir: SortDir) {
    if (col !== activeSort) return " ↕";
    return activeDir === "asc" ? " ↑" : " ↓";
}

function buildHref(params: {
    q?: string;
    from?: string;
    to?: string;
    sort?: string;
    dir?: string;
    page?: number;
    pageSize?: number;
    role?: AdminUsersRoleFilter;
    companyKey?: string;
    recruiterId?: string;
}) {
    const sp = new URLSearchParams();
    if (params.role && params.role !== "CANDIDATE") sp.set("role", params.role);
    if (params.q) sp.set("q", params.q);
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    if (params.sort && params.sort !== "joined") {
        sp.set("sort", params.sort);
        if (params.dir) sp.set("dir", params.dir);
    } else if (params.dir && params.dir !== "desc") {
        sp.set("dir", params.dir);
    }
    if (params.page && params.page > 1) sp.set("page", String(params.page));
    if (params.companyKey) sp.set("companyKey", params.companyKey);
    if (params.recruiterId) sp.set("recruiterId", params.recruiterId);
    const ps = params.pageSize ?? ADMIN_USERS_PAGE_SIZE;
    appendPageSizeParam(sp, ps, ADMIN_USERS_PAGE_SIZE);
    const qs = sp.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
}

function buildExportQuery(p: {
    role: AdminUsersRoleFilter;
    q: string;
    from: string;
    to: string;
    companyKey: string;
    recruiterId: string;
}): string {
    const sp = new URLSearchParams();
    if (p.role !== "CANDIDATE") sp.set("role", p.role);
    if (p.q.trim()) sp.set("q", p.q.trim());
    if (p.from) sp.set("from", p.from);
    if (p.to) sp.set("to", p.to);
    if (p.companyKey) sp.set("companyKey", p.companyKey);
    if (p.recruiterId) sp.set("recruiterId", p.recruiterId);
    return sp.toString();
}

function pageTitle(role: AdminUsersRoleFilter) {
    if (role === "RECRUITER") return "Recruiters";
    if (role === "ALL") return "Users";
    return "Candidates";
}

function activityColumnLabel(role: AdminUsersRoleFilter) {
    if (role === "RECRUITER") return "Jobs";
    if (role === "ALL") return "Apps / jobs";
    return "Applications";
}

function nameColumnLabel(role: AdminUsersRoleFilter) {
    if (role === "RECRUITER") return "Recruiter";
    if (role === "ALL") return "User";
    return "Candidate";
}

export default async function AdminUsersPage({ searchParams }: Props) {
    let listPayload: Awaited<ReturnType<typeof getAdminUsersList>> | null = null;
    let globalStats: Awaited<ReturnType<typeof getAdminUsersGlobalStats>> | null = null;
    let fetchError = "";

    const roleRaw = (searchParams?.role ?? "CANDIDATE").toUpperCase();
    const roleFilter: AdminUsersRoleFilter = VALID_ROLE.has(roleRaw as AdminUsersRoleFilter)
        ? (roleRaw as AdminUsersRoleFilter)
        : "CANDIDATE";

    const qRaw = norm(searchParams?.q);
    const fromStr = norm(searchParams?.from);
    const toStr = norm(searchParams?.to);
    const from = parseStart(searchParams?.from);
    const to = parseEnd(searchParams?.to);
    const companyKey = searchParams?.companyKey ?? "";
    const companyKeysSel = parseAdminIdListParam(companyKey);
    const recruiterId = searchParams?.recruiterId ?? "";

    const sort: SortKey = VALID_SORT.has(searchParams?.sort ?? "")
        ? (searchParams!.sort as SortKey)
        : "joined";
    const rawDir = searchParams?.dir;
    const dir: SortDir =
        rawDir === "asc" || rawDir === "desc" ? rawDir : (SORT_DEFAULTS[sort] ?? "desc");

    const pageRaw = searchParams?.page;
    const pageParsed = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
    const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;
    const pageSize = parseAdminTablePageSize(searchParams?.pageSize, ADMIN_USERS_PAGE_SIZE);

    let recruiters: Awaited<ReturnType<typeof getAdminRecruitersFilterOptions>> = [];
    try {
        recruiters = await getAdminRecruitersFilterOptions();
    } catch (err) {
        console.error(
            "[AdminUsersPage] getAdminRecruitersFilterOptions failed:",
            err instanceof Error ? err.message : String(err),
        );
    }
    const companyOptions = buildCompanyOptions(recruiters);
    const recruitersForCompany =
        companyKeysSel.length > 0
            ? recruiters.filter((r) => companyKeysSel.some((ck) => companyKeyForRecruiter(r) === ck))
            : [];

    let recruiterScopeIds: string[] | null = null;
    const ridList = parseAdminIdListParam(recruiterId);
    if (ridList.length > 0) {
        recruiterScopeIds = ridList;
    } else if (companyKeysSel.length > 0) {
        const ids = recruiterIdsForCompanyKeys(recruiters, companyKeysSel);
        recruiterScopeIds = ids.length > 0 ? ids : [];
    }

    const invalidScope = recruiterScopeIds !== null && recruiterScopeIds.length === 0;

    try {
        [listPayload, globalStats] = await Promise.all([
            invalidScope
                ? Promise.resolve({
                      users: [],
                      total: 0,
                      page: 1,
                      pageSize,
                      pageCount: 1,
                  })
                : getAdminUsersList({
                      page,
                      pageSize,
                      role: roleFilter,
                      q: qRaw,
                      from,
                      to,
                      sort,
                      dir,
                      companyKey: companyKey.trim() || undefined,
                      recruiterId: recruiterId.trim() || undefined,
                  }),
            getAdminUsersGlobalStats(),
        ]);
    } catch (err) {
        console.error("[AdminUsersPage] Failed to load users:", err);
        fetchError = "Failed to load users. Please refresh the page.";
    }

    let superAdmin = false;
    try {
        superAdmin = await isSuperAdmin();
    } catch (err) {
        console.error("[AdminUsersPage] isSuperAdmin check failed:", err);
    }

    const users = listPayload?.users ?? [];
    const totalFiltered = listPayload?.total ?? 0;
    const pageCount = listPayload?.pageCount ?? 1;
    const currentPage = listPayload?.page ?? page;
    const effectivePageSize = listPayload?.pageSize ?? pageSize;

    const hasActiveFilters =
        !!qRaw ||
        !!fromStr ||
        !!toStr ||
        sort !== "joined" ||
        dir !== "desc" ||
        currentPage > 1 ||
        effectivePageSize !== ADMIN_USERS_PAGE_SIZE ||
        roleFilter !== "CANDIDATE" ||
        companyKeysSel.length > 0 ||
        !!recruiterId;

    function colHref(col: SortKey) {
        const nextDir = col === sort ? (dir === "asc" ? "desc" : "asc") : SORT_DEFAULTS[col];
        return buildHref({
            role: roleFilter,
            q: searchParams?.q,
            from: searchParams?.from,
            to: searchParams?.to,
            sort: col,
            dir: nextDir,
            page: 1,
            pageSize: effectivePageSize,
            companyKey,
            recruiterId,
        });
    }

    function pageHref(p: number) {
        return buildHref({
            role: roleFilter,
            q: searchParams?.q,
            from: searchParams?.from,
            to: searchParams?.to,
            sort,
            dir,
            page: p > 1 ? p : undefined,
            pageSize: effectivePageSize,
            companyKey,
            recruiterId,
        });
    }

    function roleTabHref(r: AdminUsersRoleFilter) {
        return buildHref({
            role: r,
            q: searchParams?.q,
            from: searchParams?.from,
            to: searchParams?.to,
            sort,
            dir,
            page: 1,
            pageSize: effectivePageSize,
            companyKey,
            recruiterId,
        });
    }

    const navBaseUsers = {
        role: roleFilter,
        q: searchParams?.q,
        from: searchParams?.from,
        to: searchParams?.to,
        sort,
        dir,
        companyKey,
        recruiterId,
        pageSize: effectivePageSize,
    };
    const pageSizeHrefsUsers = Object.fromEntries(
        ADMIN_TABLE_PAGE_SIZE_OPTIONS.map((s) => [
            s,
            buildHref({
                ...navBaseUsers,
                page: 1,
                pageSize: s,
            }),
        ]),
    ) as Record<number, string>;
    const firstHrefUsers = currentPage > 1 ? pageHref(1) : null;
    const prevHrefUsers = currentPage > 1 ? pageHref(currentPage - 1) : null;
    const nextHrefUsers = currentPage < pageCount ? pageHref(currentPage + 1) : null;
    const lastHrefUsers = currentPage < pageCount ? pageHref(pageCount) : null;

    const exportQuery = buildExportQuery({
        role: roleFilter,
        q: qRaw,
        from: fromStr,
        to: toStr,
        companyKey,
        recruiterId,
    });

    const gc = globalStats;
    const subtitleParts: string[] = [];
    subtitleParts.push(`${totalFiltered.toLocaleString()} shown for current filters`);
    if (gc) {
        subtitleParts.push(
            `${gc.totalCandidates.toLocaleString()} candidates · ${gc.totalRecruiters.toLocaleString()} recruiters · ${gc.totalApplications.toLocaleString()} applications (database)`,
        );
    }
    const COLUMNS: { key: SortKey | "role" | "company" | "action"; label: string; sortable: boolean }[] = [
        { key: "name", label: nameColumnLabel(roleFilter), sortable: true },
        ...(roleFilter === "ALL" ? ([{ key: "role" as const, label: "Role", sortable: false }] as const) : []),
        { key: "location", label: "Location", sortable: true },
        ...(roleFilter !== "CANDIDATE"
            ? ([{ key: "company" as const, label: "Company", sortable: false }] as const)
            : []),
        { key: "applications", label: activityColumnLabel(roleFilter), sortable: true },
        { key: "joined", label: "Joined", sortable: true },
        { key: "action", label: "", sortable: false },
    ];

    function activityCell(u: (typeof users)[number]) {
        if (u.userRole === "RECRUITER") {
            const n = u.jobCount;
            return n > 0 ? (
                <span className="badge role-recruiter no-dot">{n}</span>
            ) : (
                <span className="muted">0</span>
            );
        }
        const n = u.applicationCount;
        return n > 0 ? (
            <span className="badge role-candidate no-dot">{n}</span>
        ) : (
            <span className="muted">0</span>
        );
    }

    return (
        <div className="page-shell">
            <div className="page-wrap">
                <section className="header-card">
                    <h1 className="header-title">{pageTitle(roleFilter)}</h1>
                    <p className="header-subtitle">{subtitleParts.join(" · ")}</p>
                </section>

                {fetchError && (
                    <div
                        className="empty-state"
                        style={{ borderColor: "rgba(247,110,138,0.2)", color: "var(--red)" }}
                    >
                        {fetchError}
                    </div>
                )}

                {!fetchError && (
                    <section className="panel panel--toolbar-first">
                        <div className="toolbar">
                            <h2 className="row-title" style={{ fontSize: 15 }}>
                                Filters &amp; scope
                            </h2>
                        </div>
                        <form
                            key={`${roleFilter}|${companyKey}|${recruiterId}|${qRaw}|${fromStr}|${toStr}|${effectivePageSize}`}
                            method="GET"
                            className="filter-form"
                            style={{ marginBottom: 12 }}
                        >
                            <input type="hidden" name="page" value="1" />
                            {roleFilter !== "CANDIDATE" && (
                                <input type="hidden" name="role" value={roleFilter} />
                            )}
                            {sort !== "joined" && <input type="hidden" name="sort" value={sort} />}
                            {dir !== "desc" && <input type="hidden" name="dir" value={dir} />}
                            {effectivePageSize !== ADMIN_USERS_PAGE_SIZE && (
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
                                        initialRecruiterIds={parseAdminIdListParam(recruiterId)}
                                        initialJobIds={[]}
                                        initialRecruiters={
                                            companyKeysSel.length > 0
                                                ? toCascadeRecruiterRows(recruitersForCompany)
                                                : toCascadeRecruiterRows(recruiters)
                                        }
                                        initialJobs={[]}
                                        showJobSelect={false}
                                        loadJobs={false}
                                        companyLabel="Companies"
                                        recruiterLabel="Recruiters"
                                    />
                                </div>
                                <div className="filter-field" style={{ gridColumn: "1 / -1" }}>
                                    <label className="filter-label">Search</label>
                                    <input
                                        name="q"
                                        defaultValue={searchParams?.q ?? ""}
                                        placeholder="Name, email, city, country, company…"
                                        className="control-input"
                                    />
                                </div>
                                <div className="filter-field">
                                    <label htmlFor="from" className="filter-label">
                                        From
                                    </label>
                                    <input
                                        id="from"
                                        name="from"
                                        type="date"
                                        defaultValue={fromStr}
                                        className="control-input"
                                    />
                                </div>
                                <div className="filter-field">
                                    <label htmlFor="to" className="filter-label">
                                        To
                                    </label>
                                    <input
                                        id="to"
                                        name="to"
                                        type="date"
                                        defaultValue={toStr}
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
                                    <Link href="/admin/users" className="btn">
                                        Clear all
                                    </Link>
                                )}
                                <AdminExportExcelButton
                                    label="Download Excel"
                                    endpoint="/api/admin/users/export"
                                    query={exportQuery}
                                    filenamePrefix="admin-users"
                                    sheetName="Users"
                                />
                            </div>
                        </form>

                        <div className="status-tabs" style={{ marginBottom: 16 }}>
                            {(["CANDIDATE", "RECRUITER", "ALL"] as const).map((r) => {
                                const label =
                                    r === "CANDIDATE" ? "Candidates" : r === "RECRUITER" ? "Recruiters" : "All users";
                                return (
                                    <Link
                                        key={r}
                                        href={roleTabHref(r)}
                                        className={`status-tab ${roleFilter === r ? "active" : ""}`}
                                    >
                                        {label}
                                    </Link>
                                );
                            })}
                        </div>

                        {invalidScope ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🏢</div>
                                No recruiters match the selected company. Pick another company or clear filters.
                            </div>
                        ) : totalFiltered === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🔍</div>
                                No users match your filters
                            </div>
                        ) : (
                            <div
                                className="jobs-table-wrap"
                                style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}
                            >
                                <table className="jobs-table">
                                    <thead>
                                        <tr>
                                            {COLUMNS.map((col) => (
                                                <th key={col.key}>
                                                    {col.sortable ? (
                                                        <Link
                                                            href={colHref(col.key as SortKey)}
                                                            className="sortable-th"
                                                        >
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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr key={u.id}>
                                                <td>
                                                    <div className="user-cell">
                                                        <div className="avatar-sm purple">
                                                            {initials(u.name ?? "")}
                                                        </div>
                                                        <div className="user-cell-info">
                                                            <Link
                                                                href={`/admin/users/${u.id}`}
                                                                className="name-link"
                                                                style={{ fontWeight: 700, fontSize: 13 }}
                                                            >
                                                                {u.name ?? "Unknown User"}
                                                            </Link>
                                                            <div className="row-sub">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {roleFilter === "ALL" && (
                                                    <td>
                                                        <span
                                                            className={
                                                                u.userRole === "RECRUITER"
                                                                    ? "badge role-recruiter"
                                                                    : "badge role-candidate"
                                                            }
                                                        >
                                                            {u.userRole === "RECRUITER" ? "Recruiter" : "Candidate"}
                                                        </span>
                                                    </td>
                                                )}
                                                <td>
                                                    {[u.city, u.country].filter(Boolean).join(", ") || (
                                                        <span className="muted">—</span>
                                                    )}
                                                </td>
                                                {roleFilter !== "CANDIDATE" && (
                                                    <td>
                                                        {u.companyName ? (
                                                            <span style={{ fontSize: 13 }}>{u.companyName}</span>
                                                        ) : (
                                                            <span className="muted">—</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td>{activityCell(u)}</td>
                                                <td>{fmt(u.createdAt)}</td>
                                                <td>
                                                    <div
                                                        style={{ display: "flex", gap: 4, alignItems: "center" }}
                                                    >
                                                        <Link
                                                            href={`/admin/users/${u.id}`}
                                                            className="btn"
                                                            style={{ padding: "5px 10px", fontSize: 11.5 }}
                                                        >
                                                            Profile →
                                                        </Link>
                                                        {superAdmin && (
                                                            <AdminRecordActions
                                                                recordType="user"
                                                                recordId={u.id}
                                                                recordLabel={u.name ?? u.email}
                                                                editFields={[
                                                                    {
                                                                        key: "userRole",
                                                                        label: "Role",
                                                                        type: "select",
                                                                        value: u.userRole,
                                                                        options: [
                                                                            { value: "CANDIDATE", label: "Candidate" },
                                                                            { value: "RECRUITER", label: "Recruiter" },
                                                                        ],
                                                                    },
                                                                    {
                                                                        key: "isAdmin",
                                                                        label: "Admin",
                                                                        type: "checkbox",
                                                                        value: u.isAdmin ?? false,
                                                                    },
                                                                ]}
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <AdminDataTablePagination
                                    currentPage={currentPage}
                                    pageCount={pageCount}
                                    totalItems={totalFiltered}
                                    pageSize={effectivePageSize}
                                    pageSizeHrefs={pageSizeHrefsUsers}
                                    firstHref={firstHrefUsers}
                                    prevHref={prevHrefUsers}
                                    nextHref={nextHrefUsers}
                                    lastHref={lastHrefUsers}
                                    ariaLabel="Users pagination"
                                />
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
