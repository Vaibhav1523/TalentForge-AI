import { ApplicationStatus, BookingStatus, Prisma, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { AdminRecruiterFilterRow } from "./admin-filter-helpers";
import {
    companyKeyForRecruiter,
    organizationIdsForCompanyKeys,
    parseAdminIdListParam,
    recruiterIdsForCompanyKey,
    recruiterIdsForCompanyKeys,
} from "./admin-filter-helpers";

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

export type AdminUser = {
    id: string;
    email: string;
    name: string;
    userRole: string;
    isAdmin: boolean;
    city: string;
    country: string;
    createdAt: Date | null;
    applicationCount: number;
    /** Jobs posted (recruiters only); 0 for candidates */
    jobCount: number;
    companySlug: string | null;
    companyName: string | null;
};

export type AdminUserProfile = {
    id: string;
    email: string;
    name: string;
    userRole: string;
    profileImageUrl: string;
    roleSelectedAt: Date | null;
    phoneNumber: string;
    country: string;
    state: string;
    city: string;
    linkedin: string;
    github: string;
    twitter: string;
    currentCTC: string;
    expectedCTC: string;
    noticePeriod: string;
    resumeUrl: string;
    companySlug: string | null;
    companyName: string | null;
    notificationNewApplications: boolean | null;
    notificationInterviewUpdates: boolean | null;
    notificationPlatformNews: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};

export type RecruiterSummary = {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    companySlug: string | null;
    companyName: string | null;
    organizationId: string | null;
    organizationSlug: string | null;
    createdAt: Date | null;
    totalJobs: number;
    activeJobs: number;
    draftJobs: number;
    closedJobs: number;
    archivedJobs: number;
    totalApplications: number;
    latestJobAt: Date | null;
    jobs: Array<{
        id: string;
        title: string;
        company: string;
        companySlug: string | null;
        status: string;
        applicationCount: number;
        createdAt: Date | null;
    }>;
};

export type AdminJob = {
    id: string;
    title: string;
    company: string;
    location: string;
    status: string;
    companyId: string;
    companySlug: string | null;
    /** When set, job is visible to all org members with this organization id */
    organizationId: string | null;
    recruiterName: string;
    applicationCount: number;
    createdAt: Date | null;
};

export type AdminApplication = {
    id: string;
    jobId: string;
    companyId: string;
    resumeUrl: string;
    motivation: string;
    currentCTC: string;
    expectedCTC: string;
    currentCurrency: string;
    expectedCurrency: string;
    noticePeriod: string;
    city: string;
    status: string;
    appliedAt: Date | null;
    interviewScheduledAt: Date | null;
    job: {
        id: string;
        title: string;
        company: string;
        location: string;
        status: string;
        companySlug: string | null;
    } | null;
};

export type AdminDashboardApplication = {
    id: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    jobId: string;
    jobTitle: string;
    company: string;
    companySlug: string | null;
    status: string;
    appliedAt: Date | null;
    resumeUrl: string;
};

/** Sales / demo leads (site form) + Cal booking time when present */
export type AdminDashboardLead = {
    id: string;
    name: string;
    email: string;
    company: string;
    phone: string | null;
    /** Short preview of roles / message field */
    rolesSnippet: string | null;
    createdAt: Date | null;
    /** Next upcoming confirmed call, or last past call, or null */
    meetAt: Date | null;
    meetKind: "upcoming" | "past" | "none";
    isNew: boolean;
    confirmedBookingCount: number;
};

const NEW_LEAD_DAYS = 7;

/** From confirmed bookings: next upcoming `scheduledAt`, else most recent past. */
export function pickLeadMeetSummary(
    bookings: { scheduledAt: Date; status: string }[],
    now = new Date(),
): { meetAt: Date | null; meetKind: "upcoming" | "past" | "none" } {
    const confirmed = bookings.filter((b) => b.status === BookingStatus.CONFIRMED);
    const sorted = [...confirmed].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const t = now.getTime();
    const next = sorted.find((b) => b.scheduledAt.getTime() >= t);
    if (next) return { meetAt: next.scheduledAt, meetKind: "upcoming" };
    const lastPast = [...sorted].reverse().find((b) => b.scheduledAt.getTime() < t);
    if (lastPast) return { meetAt: lastPast.scheduledAt, meetKind: "past" };
    return { meetAt: null, meetKind: "none" };
}

export function snippet(text: string | null | undefined, max = 72): string | null {
    if (text == null || !String(text).trim()) return null;
    const s = String(text).trim().replace(/\s+/g, " ");
    return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/** Wider row for Excel export (admin applications). */
export type AdminApplicationExportRow = AdminDashboardApplication & {
    candidatePhone: string;
    candidateSkills: string;
    candidateCity: string;
    candidateState: string;
    candidateCountry: string;
    candidateLinkedin: string;
    candidateGithub: string;
    candidateTwitter: string;
    candidateProfileCurrentCTC: string;
    candidateProfileExpectedCTC: string;
    candidateProfileNoticePeriod: string;
    motivation: string;
    applicationCity: string;
    currentCTC: string;
    expectedCTC: string;
    currentCurrency: string;
    expectedCurrency: string;
    noticePeriod: string;
};

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD DATA (all pages)
   ═══════════════════════════════════════════════════════════════════════ */

const ADMIN_PAGE_LIMIT = 500;

export const ADMIN_APPLICATIONS_PAGE_SIZE = 50;

export const ADMIN_USERS_PAGE_SIZE = 50;

export const ADMIN_JOBS_PAGE_SIZE = 50;

export const ADMIN_RECRUITERS_PAGE_SIZE = 50;

export type AdminUsersRoleFilter = "ALL" | "CANDIDATE" | "RECRUITER";

export type AdminUsersSortKey = "name" | "location" | "applications" | "joined";

function buildAdminUsersScopeWhere(opts: {
    role: AdminUsersRoleFilter;
    recruiterScopeIds: string[] | null;
}): Prisma.UserWhereInput[] {
    const parts: Prisma.UserWhereInput[] = [];
    const ids = opts.recruiterScopeIds;

    if (opts.role === "CANDIDATE") {
        parts.push({ userRole: UserRole.CANDIDATE });
        if (ids?.length) {
            parts.push({ applications: { some: { companyId: { in: ids } } } });
        }
    } else if (opts.role === "RECRUITER") {
        parts.push({ userRole: UserRole.RECRUITER });
        if (ids?.length) {
            parts.push({ id: { in: ids } });
        }
    } else if (ids?.length) {
        parts.push({
            OR: [
                { userRole: UserRole.RECRUITER, id: { in: ids } },
                {
                    userRole: UserRole.CANDIDATE,
                    applications: { some: { companyId: { in: ids } } },
                },
            ],
        });
    }
    return parts;
}

function adminUsersOrderBy(
    sort: AdminUsersSortKey,
    dir: "asc" | "desc",
    role: AdminUsersRoleFilter,
): Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[] {
    switch (sort) {
        case "name":
            return { name: dir };
        case "location":
            return [{ country: dir }, { city: dir }];
        case "applications":
            if (role === "RECRUITER") {
                return { jobs: { _count: dir } };
            }
            return { applications: { _count: dir } };
        case "joined":
        default:
            return { createdAt: dir };
    }
}

function mapRawUserToAdminUser(u: {
    id: string;
    email: string | null;
    name: string | null;
    userRole: UserRole;
    isAdmin: boolean | null;
    city: string | null;
    country: string | null;
    createdAt: Date | null;
    companySlug: string | null;
    companyName: string | null;
    _count: { applications: number; jobs: number };
}): AdminUser {
    return {
        id: u.id,
        email: u.email ?? "No email",
        name: u.name ?? "Unnamed User",
        userRole: String(u.userRole ?? "UNKNOWN"),
        isAdmin: u.isAdmin ?? false,
        city: u.city ?? "",
        country: u.country ?? "",
        createdAt: u.createdAt ?? null,
        applicationCount: u._count.applications,
        jobCount: u._count.jobs,
        companySlug: u.companySlug ?? null,
        companyName: u.companyName ?? null,
    };
}

/** Paginated users for /admin/users (full table, not dashboard cap). */
export async function getAdminUsersList(opts: {
    page: number;
    pageSize?: number;
    role: AdminUsersRoleFilter;
    q: string;
    from: Date | null;
    to: Date | null;
    sort: AdminUsersSortKey;
    dir: "asc" | "desc";
    companyKey?: string;
    recruiterId?: string;
}) {
    const pageSize = Math.min(Math.max(opts.pageSize ?? ADMIN_USERS_PAGE_SIZE, 1), 200);
    const page = Math.max(opts.page, 1);
    const skip = (page - 1) * pageSize;

    let recruiterScopeIds: string[] | null = null;
    const ridList = parseAdminIdListParam(opts.recruiterId);
    const companyKeys = parseAdminIdListParam(opts.companyKey);
    if (ridList.length > 0) {
        recruiterScopeIds = ridList;
    } else if (companyKeys.length > 0) {
        const recruiters = await getAdminRecruitersFilterOptions();
        const ids = recruiterIdsForCompanyKeys(recruiters, companyKeys);
        recruiterScopeIds = ids.length > 0 ? ids : [];
    }

    if (recruiterScopeIds && recruiterScopeIds.length === 0) {
        return {
            users: [] as AdminUser[],
            total: 0,
            page,
            pageSize,
            pageCount: 1,
        };
    }

    const scopeParts = buildAdminUsersScopeWhere({ role: opts.role, recruiterScopeIds });
    const andParts: Prisma.UserWhereInput[] = [...scopeParts];

    const q = opts.q.trim();
    if (q) {
        andParts.push({
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
                { country: { contains: q, mode: "insensitive" } },
                { companyName: { contains: q, mode: "insensitive" } },
            ],
        });
    }

    if (opts.from || opts.to) {
        const range: Prisma.DateTimeFilter = {};
        if (opts.from) range.gte = opts.from;
        if (opts.to) range.lte = opts.to;
        andParts.push({ createdAt: range });
    }

    const where: Prisma.UserWhereInput =
        andParts.length === 0 ? {} : andParts.length === 1 ? andParts[0]! : { AND: andParts };

    const orderBy = adminUsersOrderBy(opts.sort, opts.dir, opts.role);

    const [total, rawUsers] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            orderBy,
            skip,
            take: pageSize,
            select: {
                id: true,
                email: true,
                name: true,
                userRole: true,
                isAdmin: true,
                city: true,
                country: true,
                createdAt: true,
                companySlug: true,
                companyName: true,
                _count: { select: { applications: true, jobs: true } },
            },
        }),
    ]);

    return {
        users: rawUsers.map(mapRawUserToAdminUser),
        total,
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
}

export async function getAdminUsersExportRows(opts: {
    role: AdminUsersRoleFilter;
    q: string;
    from: Date | null;
    to: Date | null;
    companyKey?: string;
    recruiterId?: string;
    take?: number;
}): Promise<AdminUser[]> {
    const take = Math.min(Math.max(opts.take ?? 20000, 1), 25000);

    let recruiterScopeIds: string[] | null = null;
    const ridList = parseAdminIdListParam(opts.recruiterId);
    const companyKeysExport = parseAdminIdListParam(opts.companyKey);
    if (ridList.length > 0) {
        recruiterScopeIds = ridList;
    } else if (companyKeysExport.length > 0) {
        const recruiters = await getAdminRecruitersFilterOptions();
        const ids = recruiterIdsForCompanyKeys(recruiters, companyKeysExport);
        recruiterScopeIds = ids.length > 0 ? ids : [];
    }

    if (recruiterScopeIds && recruiterScopeIds.length === 0) {
        return [];
    }

    const scopeParts = buildAdminUsersScopeWhere({ role: opts.role, recruiterScopeIds });
    const andParts: Prisma.UserWhereInput[] = [...scopeParts];

    const q = opts.q.trim();
    if (q) {
        andParts.push({
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
                { country: { contains: q, mode: "insensitive" } },
                { companyName: { contains: q, mode: "insensitive" } },
            ],
        });
    }

    if (opts.from || opts.to) {
        const range: Prisma.DateTimeFilter = {};
        if (opts.from) range.gte = opts.from;
        if (opts.to) range.lte = opts.to;
        andParts.push({ createdAt: range });
    }

    const where: Prisma.UserWhereInput =
        andParts.length === 0 ? {} : andParts.length === 1 ? andParts[0]! : { AND: andParts };

    const rawUsers = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        select: {
            id: true,
            email: true,
            name: true,
            userRole: true,
            isAdmin: true,
            city: true,
            country: true,
            createdAt: true,
            companySlug: true,
            companyName: true,
            _count: { select: { applications: true, jobs: true } },
        },
    });

    return rawUsers.map(mapRawUserToAdminUser);
}

export async function getAdminUsersGlobalStats(): Promise<{
    totalCandidates: number;
    totalRecruiters: number;
    totalApplications: number;
}> {
    const [totalCandidates, totalRecruiters, totalApplications] = await Promise.all([
        prisma.user.count({ where: { userRole: UserRole.CANDIDATE } }),
        prisma.user.count({ where: { userRole: UserRole.RECRUITER } }),
        prisma.application.count(),
    ]);
    return { totalCandidates, totalRecruiters, totalApplications };
}

export type AdminApplicationsSortKey = "candidate" | "job" | "company" | "status" | "applied";

function applicationsListOrderBy(
    sort: AdminApplicationsSortKey,
    dir: "asc" | "desc"
): Prisma.ApplicationOrderByWithRelationInput {
    switch (sort) {
        case "candidate":
            return { candidate: { name: dir } };
        case "job":
            return { job: { title: dir } };
        case "company":
            return { job: { company: dir } };
        case "status":
            return { status: dir };
        case "applied":
        default:
            return { appliedAt: dir };
    }
}

/** Applications for any of the selected recruiter posters (plus org posts when applicable). */
export function applicationWhereForSelectedRecruiters(
    recruiterIds: string[],
    recruiters: AdminRecruiterFilterRow[],
): Prisma.ApplicationWhereInput {
    const set = new Set(recruiterIds);
    const matching = recruiters.filter((r) => set.has(r.id));
    if (matching.length === 0) return { jobId: { in: [] } };
    const ors: Prisma.ApplicationWhereInput[] = matching.map((r) =>
        r.organizationId
            ? { OR: [{ companyId: r.id }, { organizationId: r.organizationId }] }
            : { companyId: r.id },
    );
    return ors.length === 1 ? ors[0]! : { OR: ors };
}

/** Resolve poster/org scope from comma-separated company keys and/or recruiter ids. */
export function resolveAdminApplicationsScope(
    recruiters: AdminRecruiterFilterRow[],
    companyKeyCsv: string,
    recruiterIdCsv: string,
): { applicationScopeOr: Prisma.ApplicationWhereInput | null; emptyCompanyScope: boolean } {
    const companyKeys = parseAdminIdListParam(companyKeyCsv);
    const rawSel = parseAdminIdListParam(recruiterIdCsv);
    const selected = rawSel.filter((id) => {
        const r = recruiters.find((x) => x.id === id);
        if (!r) return false;
        if (companyKeys.length === 0) return true;
        return companyKeys.includes(companyKeyForRecruiter(r));
    });
    if (selected.length > 0) {
        return {
            applicationScopeOr: applicationWhereForSelectedRecruiters(selected, recruiters),
            emptyCompanyScope: false,
        };
    }
    if (companyKeys.length > 0) {
        const ids = recruiterIdsForCompanyKeys(recruiters, companyKeys);
        if (ids.length === 0) return { applicationScopeOr: null, emptyCompanyScope: true };
        const orgIds = organizationIdsForCompanyKeys(recruiters, companyKeys);
        const applicationScopeOr: Prisma.ApplicationWhereInput =
            orgIds.length > 0
                ? { OR: [{ companyId: { in: ids } }, { organizationId: { in: orgIds } }] }
                : { companyId: { in: ids } };
        return { applicationScopeOr, emptyCompanyScope: false };
    }
    return { applicationScopeOr: null, emptyCompanyScope: false };
}

function buildApplicationListWhere(opts: {
    q: string;
    status: string;
    applicationScopeOr?: Prisma.ApplicationWhereInput | null;
    jobIds?: string[];
}): Prisma.ApplicationWhereInput {
    const parts = buildApplicationListWhereParts(opts);
    return parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { AND: parts };
}

function buildApplicationListWhereParts(opts: {
    q: string;
    status: string;
    applicationScopeOr?: Prisma.ApplicationWhereInput | null;
    jobIds?: string[];
}): Prisma.ApplicationWhereInput[] {
    const q = opts.q.trim();
    const qParts: Prisma.ApplicationWhereInput[] = [];
    if (q) {
        qParts.push({
            OR: [
                { candidate: { name: { contains: q, mode: "insensitive" } } },
                { candidate: { email: { contains: q, mode: "insensitive" } } },
                { job: { title: { contains: q, mode: "insensitive" } } },
                { job: { company: { contains: q, mode: "insensitive" } } },
            ],
        });
    }
    if (opts.status && opts.status !== "ALL") {
        qParts.push({ status: opts.status as ApplicationStatus });
    }

    if (
        opts.applicationScopeOr != null &&
        typeof opts.applicationScopeOr === "object" &&
        Object.keys(opts.applicationScopeOr).length > 0
    ) {
        qParts.push(opts.applicationScopeOr);
    }

    const jids = (opts.jobIds ?? []).filter(Boolean);
    if (jids.length > 0) qParts.push({ jobId: { in: jids } });
    return qParts;
}

/** Paginated applications for /admin/applications (server-side filter + sort). */
export async function getAdminApplicationsList(opts: {
    page: number;
    pageSize?: number;
    status: string;
    q: string;
    sort: AdminApplicationsSortKey;
    dir: "asc" | "desc";
    /** Poster/org scope; omit or null = platform-wide for scope */
    applicationScopeOr?: Prisma.ApplicationWhereInput | null;
    jobIds?: string[];
    /** Company selected but no recruiters match that key — return empty rows and zero scoped counts */
    emptyCompanyScope?: boolean;
}) {
    const pageSize = Math.min(Math.max(opts.pageSize ?? ADMIN_APPLICATIONS_PAGE_SIZE, 1), 100);
    const page = Math.max(opts.page, 1);
    const skip = (page - 1) * pageSize;

    if (opts.emptyCompanyScope) {
        const platformTotal = await prisma.application.count();
        return {
            applications: [] as AdminDashboardApplication[],
            totalFiltered: 0,
            totalAll: platformTotal,
            scopedTotal: 0,
            countsByStatus: {} as Record<string, number>,
            page: 1,
            pageSize,
            pageCount: 1,
        };
    }

    const scopeParts = buildApplicationListWhereParts({
        q: opts.q,
        status: "ALL",
        applicationScopeOr: opts.applicationScopeOr ?? undefined,
        jobIds: opts.jobIds,
    });
    const scopeWhere: Prisma.ApplicationWhereInput =
        scopeParts.length === 0 ? {} : scopeParts.length === 1 ? scopeParts[0]! : { AND: scopeParts };

    const listWhere = buildApplicationListWhere({
        q: opts.q,
        status: opts.status,
        applicationScopeOr: opts.applicationScopeOr ?? undefined,
        jobIds: opts.jobIds,
    });

    const [platformTotal, groupedScoped, scopedTotal, totalFiltered, rawApplications] = await Promise.all([
        prisma.application.count(),
        prisma.application.groupBy({
            by: ["status"],
            where: scopeWhere,
            _count: { _all: true },
        }),
        prisma.application.count({ where: scopeWhere }),
        prisma.application.count({ where: listWhere }),
        prisma.application.findMany({
            where: listWhere,
            orderBy: applicationsListOrderBy(opts.sort, opts.dir),
            skip,
            take: pageSize,
            select: {
                id: true,
                candidateId: true,
                jobId: true,
                status: true,
                appliedAt: true,
                resumeUrl: true,
                candidate: { select: { name: true, email: true } },
                job: {
                    select: {
                        id: true,
                        title: true,
                        company: true,
                        companyUser: { select: { companySlug: true } },
                    },
                },
            },
        }),
    ]);

    const countsByStatus: Record<string, number> = {};
    for (const row of groupedScoped) {
        countsByStatus[String(row.status)] = row._count._all;
    }

    const applications: AdminDashboardApplication[] = rawApplications.map((a) => ({
        id: a.id,
        candidateId: a.candidateId,
        candidateName: a.candidate?.name ?? "Unknown",
        candidateEmail: a.candidate?.email ?? "N/A",
        jobId: a.jobId,
        jobTitle: a.job?.title ?? "Untitled Job",
        company: a.job?.company ?? "Unknown Company",
        companySlug: a.job?.companyUser?.companySlug ?? null,
        status: String(a.status ?? "UNKNOWN"),
        appliedAt: a.appliedAt ?? null,
        resumeUrl: a.resumeUrl ?? "",
    }));

    return {
        applications,
        totalFiltered,
        /** All applications in DB (unfiltered) */
        totalAll: platformTotal,
        /** Matches scope + search + job, before status tab */
        scopedTotal,
        countsByStatus,
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil(totalFiltered / pageSize)),
    };
}

export async function getAdminApplicationsExportRows(opts: {
    status: string;
    q: string;
    applicationScopeOr?: Prisma.ApplicationWhereInput | null;
    jobIds?: string[];
    sort: AdminApplicationsSortKey;
    dir: "asc" | "desc";
    take?: number;
}): Promise<AdminApplicationExportRow[]> {
    const take = Math.min(Math.max(opts.take ?? 15000, 1), 20000);
    const listWhere = buildApplicationListWhere({
        q: opts.q,
        status: opts.status,
        applicationScopeOr: opts.applicationScopeOr ?? undefined,
        jobIds: opts.jobIds,
    });
    const rawApplications = await prisma.application.findMany({
        where: listWhere,
        orderBy: applicationsListOrderBy(opts.sort, opts.dir),
        take,
        select: {
            id: true,
            candidateId: true,
            jobId: true,
            status: true,
            appliedAt: true,
            resumeUrl: true,
            motivation: true,
            currentCTC: true,
            expectedCTC: true,
            currentCurrency: true,
            expectedCurrency: true,
            noticePeriod: true,
            city: true,
            candidate: {
                select: {
                    name: true,
                    email: true,
                    phoneNumber: true,
                    skills: true,
                    city: true,
                    state: true,
                    country: true,
                    linkedin: true,
                    github: true,
                    twitter: true,
                    currentCTC: true,
                    expectedCTC: true,
                    noticePeriod: true,
                },
            },
            job: {
                select: {
                    id: true,
                    title: true,
                    company: true,
                    companyUser: { select: { companySlug: true } },
                },
            },
        },
    });
    return rawApplications.map((a) => ({
        id: a.id,
        candidateId: a.candidateId,
        candidateName: a.candidate?.name ?? "Unknown",
        candidateEmail: a.candidate?.email ?? "N/A",
        jobId: a.jobId,
        jobTitle: a.job?.title ?? "Untitled Job",
        company: a.job?.company ?? "Unknown Company",
        companySlug: a.job?.companyUser?.companySlug ?? null,
        status: String(a.status ?? "UNKNOWN"),
        appliedAt: a.appliedAt ?? null,
        resumeUrl: a.resumeUrl ?? "",
        candidatePhone: a.candidate?.phoneNumber ?? "",
        candidateSkills: (a.candidate?.skills ?? []).join(", "),
        candidateCity: a.candidate?.city ?? "",
        candidateState: a.candidate?.state ?? "",
        candidateCountry: a.candidate?.country ?? "",
        candidateLinkedin: a.candidate?.linkedin ?? "",
        candidateGithub: a.candidate?.github ?? "",
        candidateTwitter: a.candidate?.twitter ?? "",
        candidateProfileCurrentCTC: a.candidate?.currentCTC ?? "",
        candidateProfileExpectedCTC: a.candidate?.expectedCTC ?? "",
        candidateProfileNoticePeriod: a.candidate?.noticePeriod ?? "",
        motivation: (a.motivation ?? "").replace(/\s+/g, " ").trim(),
        applicationCity: a.city ?? "",
        currentCTC: a.currentCTC ?? "",
        expectedCTC: a.expectedCTC ?? "",
        currentCurrency: a.currentCurrency ?? "",
        expectedCurrency: a.expectedCurrency ?? "",
        noticePeriod: a.noticePeriod ?? "",
    }));
}

export async function getAdminRecruitersFilterOptions(): Promise<AdminRecruiterFilterRow[]> {
    const rows = await prisma.user.findMany({
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
    });
    return rows.map((r) => ({
        id: r.id,
        name: r.name ?? "Unnamed",
        companyName: r.companyName ?? "",
        companySlug: r.companySlug ?? null,
        organizationId: r.organizationId ?? null,
        organizationSlug: r.organization?.slug ?? null,
    }));
}

export type AdminJobMini = {
    id: string;
    title: string;
    company: string;
    companyId: string;
    organizationId: string | null;
};

export async function getAdminJobsMiniForDropdown(): Promise<AdminJobMini[]> {
    const rows = await prisma.job.findMany({
        orderBy: { createdAt: "desc" },
        take: 15000,
        select: { id: true, title: true, company: true, companyId: true, organizationId: true },
    });
    return rows.map((j) => ({
        id: j.id,
        title: j.title ?? "",
        company: j.company ?? "",
        companyId: j.companyId,
        organizationId: j.organizationId ?? null,
    }));
}

/** All jobs (up to cap) for admin Jobs list + export. */
export async function getAdminJobsFlat(): Promise<AdminJob[]> {
    const raw = await prisma.job.findMany({
        orderBy: { createdAt: "desc" },
        take: 25000,
        select: {
            id: true,
            title: true,
            company: true,
            location: true,
            status: true,
            companyId: true,
            organizationId: true,
            createdAt: true,
            companyUser: { select: { name: true, companySlug: true } },
            _count: { select: { applications: true } },
        },
    });
    return raw.map((j) => ({
        id: j.id,
        title: j.title ?? "Untitled Job",
        company: j.company ?? "Unknown Company",
        location: j.location ?? "N/A",
        status: String(j.status ?? "UNKNOWN"),
        companyId: j.companyId ?? "",
        companySlug: j.companyUser?.companySlug ?? null,
        organizationId: j.organizationId ?? null,
        recruiterName: j.companyUser?.name ?? "Unknown",
        applicationCount: j._count.applications,
        createdAt: j.createdAt ?? null,
    }));
}

export async function getAdminJobStats(): Promise<{ totalJobs: number; activeJobs: number }> {
    const [totalJobs, activeJobs] = await Promise.all([
        prisma.job.count(),
        prisma.job.count({ where: { status: "ACTIVE" } }),
    ]);
    return { totalJobs, activeJobs };
}

/**
 * All recruiters with accurate job/application aggregates (not capped to dashboard’s 500 mixed users).
 * Used by /admin/recruiters.
 */
export async function getAdminRecruiterSummariesFull(): Promise<RecruiterSummary[]> {
    const [recruiterUsers, jobsRaw] = await Promise.all([
        prisma.user.findMany({
            where: { userRole: UserRole.RECRUITER },
            select: {
                id: true,
                email: true,
                name: true,
                isAdmin: true,
                companySlug: true,
                companyName: true,
                organizationId: true,
                organization: { select: { slug: true } },
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.job.findMany({
            orderBy: { createdAt: "desc" },
            take: 25000,
            select: {
                id: true,
                title: true,
                company: true,
                location: true,
                status: true,
                companyId: true,
                organizationId: true,
                createdAt: true,
                companyUser: { select: { name: true, companySlug: true } },
                _count: { select: { applications: true } },
            },
        }),
    ]);

    const jobs: AdminJob[] = jobsRaw.map((j) => ({
        id: j.id,
        title: j.title ?? "Untitled Job",
        company: j.company ?? "Unknown Company",
        location: j.location ?? "N/A",
        status: String(j.status ?? "UNKNOWN"),
        companyId: j.companyId ?? "",
        companySlug: j.companyUser?.companySlug ?? null,
        organizationId: j.organizationId ?? null,
        recruiterName: j.companyUser?.name ?? "Unknown",
        applicationCount: j._count.applications,
        createdAt: j.createdAt ?? null,
    }));

    const companyJobsByPosterId = new Map<string, AdminJob[]>();
    const orgJobsByOrganizationId = new Map<string, AdminJob[]>();
    for (const j of jobs) {
        if (j.companyId) {
            const list = companyJobsByPosterId.get(j.companyId) ?? [];
            list.push(j);
            companyJobsByPosterId.set(j.companyId, list);
        }
        if (j.organizationId) {
            const list = orgJobsByOrganizationId.get(j.organizationId) ?? [];
            list.push(j);
            orgJobsByOrganizationId.set(j.organizationId, list);
        }
    }

    /** Jobs posted by this user plus any job tied to their org (shared multi-recruiter org). */
    function jobsVisibleToRecruiter(u: { id: string; organizationId: string | null }): AdminJob[] {
        const byId = new Map<string, AdminJob>();
        for (const j of companyJobsByPosterId.get(u.id) ?? []) {
            byId.set(j.id, j);
        }
        const oid = u.organizationId;
        if (oid) {
            for (const j of orgJobsByOrganizationId.get(oid) ?? []) {
                byId.set(j.id, j);
            }
        }
        return Array.from(byId.values());
    }

    function aggregateFromJobList(jobList: AdminJob[]): {
        totalJobs: number;
        activeJobs: number;
        draftJobs: number;
        closedJobs: number;
        archivedJobs: number;
        totalApplications: number;
        latestJobAt: Date | null;
        jobs: RecruiterSummary["jobs"];
    } {
        let activeJobs = 0;
        let draftJobs = 0;
        let closedJobs = 0;
        let archivedJobs = 0;
        let totalApplications = 0;
        let latestJobAt: Date | null = null;
        const rows: RecruiterSummary["jobs"] = [];
        for (const job of jobList) {
            totalApplications += job.applicationCount;
            if (job.status === "ACTIVE") activeJobs += 1;
            if (job.status === "DRAFT") draftJobs += 1;
            if (job.status === "CLOSED") closedJobs += 1;
            if (job.status === "ARCHIVED") archivedJobs += 1;
            if (job.createdAt && (!latestJobAt || job.createdAt > latestJobAt)) latestJobAt = job.createdAt;
            rows.push({
                id: job.id,
                title: job.title,
                company: job.company,
                companySlug: job.companySlug,
                status: job.status,
                applicationCount: job.applicationCount,
                createdAt: job.createdAt,
            });
        }
        rows.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
        return {
            totalJobs: jobList.length,
            activeJobs,
            draftJobs,
            closedJobs,
            archivedJobs,
            totalApplications,
            latestJobAt,
            jobs: rows,
        };
    }

    return recruiterUsers
        .map((u) => {
            const agg = aggregateFromJobList(jobsVisibleToRecruiter(u));
            return {
                id: u.id,
                email: u.email ?? "No email",
                name: u.name ?? "Unnamed User",
                isAdmin: u.isAdmin ?? false,
                companySlug: u.companySlug ?? null,
                companyName: u.companyName ?? null,
                organizationId: u.organizationId ?? null,
                organizationSlug: u.organization?.slug ?? null,
                createdAt: u.createdAt ?? null,
                totalJobs: agg.totalJobs,
                activeJobs: agg.activeJobs,
                draftJobs: agg.draftJobs,
                closedJobs: agg.closedJobs,
                archivedJobs: agg.archivedJobs,
                totalApplications: agg.totalApplications,
                latestJobAt: agg.latestJobAt,
                jobs: agg.jobs,
            };
        })
        .sort((a, b) => b.totalJobs - a.totalJobs);
}

export function filterAdminJobsList(
    jobs: AdminJob[],
    recruiters: AdminRecruiterFilterRow[],
    filters: {
        status: string;
        q: string;
        companyKey: string;
        recruiterId: string;
        jobId: string;
    },
): AdminJob[] {
    const q = filters.q.trim().toLowerCase();
    let list = jobs;
    const jobIds = parseAdminIdListParam(filters.jobId);
    const recruiterIds = parseAdminIdListParam(filters.recruiterId);
    const companyKeys = parseAdminIdListParam(filters.companyKey);
    if (jobIds.length > 0) {
        const want = new Set(jobIds);
        list = list.filter((j) => want.has(j.id));
    } else if (recruiterIds.length > 0) {
        const sel = new Set(recruiterIds);
        const matching = recruiters.filter((r) => sel.has(r.id));
        const posterIds = new Set(matching.map((r) => r.id));
        const orgIds = new Set(matching.map((r) => r.organizationId).filter((x): x is string => !!x));
        list = list.filter(
            (j) =>
                posterIds.has(j.companyId) || (!!j.organizationId && orgIds.has(j.organizationId)),
        );
    } else if (companyKeys.length > 0) {
        const matching = recruiters.filter((r) =>
            companyKeys.some((ck) => companyKeyForRecruiter(r) === ck),
        );
        const posterIds = new Set(matching.map((r) => r.id));
        const orgIds = new Set(
            matching.map((r) => r.organizationId).filter((x): x is string => !!x),
        );
        list = list.filter(
            (j) =>
                posterIds.has(j.companyId) ||
                (!!j.organizationId && orgIds.has(j.organizationId)),
        );
    }
    if (filters.status !== "ALL") list = list.filter((j) => j.status === filters.status);
    if (q) {
        list = list.filter(
            (j) =>
                (j.title ?? "").toLowerCase().includes(q) ||
                (j.company ?? "").toLowerCase().includes(q) ||
                (j.recruiterName ?? "").toLowerCase().includes(q) ||
                (j.location ?? "").toLowerCase().includes(q),
        );
    }
    return list;
}

export async function getAdminDashboardData(opts?: {
    take?: number;
    skipUsers?: number;
    skipJobs?: number;
    skipApplications?: number;
}) {
    const limit = opts?.take ?? ADMIN_PAGE_LIMIT;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - NEW_LEAD_DAYS);

    const [
        rawUsers, rawJobs, rawApplications,
        totalUsersCount, totalJobsCount, totalApplicationsCount,
        totalCandidatesCount, totalRecruitersCount, activeJobsCount,
        recruitersWithPostsCount,
        rawLeads,
        totalLeadsCount,
        newLeadsLast7dCount,
        upcomingMeetLeadGroups,
    ] = await Promise.all([
        prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: opts?.skipUsers ?? 0,
            select: {
                id: true,
                email: true,
                name: true,
                userRole: true,
                isAdmin: true,
                city: true,
                country: true,
                createdAt: true,
                companySlug: true,
                companyName: true,
                organizationId: true,
                organization: { select: { slug: true } },
                _count: { select: { applications: true, jobs: true } },
            },
        }),
        prisma.job.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: opts?.skipJobs ?? 0,
            select: {
                id: true,
                title: true,
                company: true,
                location: true,
                status: true,
                companyId: true,
                organizationId: true,
                createdAt: true,
                companyUser: { select: { name: true, companySlug: true } },
                _count: { select: { applications: true } },
            },
        }),
        prisma.application.findMany({
            orderBy: { appliedAt: "desc" },
            take: limit,
            skip: opts?.skipApplications ?? 0,
            select: {
                id: true,
                candidateId: true,
                jobId: true,
                status: true,
                appliedAt: true,
                resumeUrl: true,
                candidate: { select: { name: true, email: true } },
                job: { select: { id: true, title: true, company: true, companyUser: { select: { companySlug: true } } } },
            },
        }),
        prisma.user.count(),
        prisma.job.count(),
        prisma.application.count(),
        prisma.user.count({ where: { userRole: "CANDIDATE" } }),
        prisma.user.count({ where: { userRole: "RECRUITER" } }),
        prisma.job.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { userRole: "RECRUITER", jobs: { some: {} } } }),
        prisma.lead.findMany({
            orderBy: { createdAt: "desc" },
            take: 25,
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
                phone: true,
                roles: true,
                createdAt: true,
                booking: {
                    where: { status: BookingStatus.CONFIRMED },
                    select: { scheduledAt: true, status: true },
                    orderBy: { scheduledAt: "asc" },
                },
            },
        }),
        prisma.lead.count(),
        prisma.lead.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.booking.groupBy({
            by: ["leadId"],
            where: {
                status: BookingStatus.CONFIRMED,
                scheduledAt: { gte: new Date() },
            },
        }),
    ]);

    const users: AdminUser[] = rawUsers.map((u) => ({
        id: u.id,
        email: u.email ?? "No email",
        name: u.name ?? "Unnamed User",
        userRole: String(u.userRole ?? "UNKNOWN"),
        isAdmin: u.isAdmin ?? false,
        city: u.city ?? "",
        country: u.country ?? "",
        createdAt: u.createdAt ?? null,
        applicationCount: u._count.applications,
        jobCount: u._count.jobs,
        companySlug: u.companySlug ?? null,
        companyName: u.companyName ?? null,
    }));

    const jobs: AdminJob[] = rawJobs.map((j) => ({
        id: j.id,
        title: j.title ?? "Untitled Job",
        company: j.company ?? "Unknown Company",
        location: j.location ?? "N/A",
        status: String(j.status ?? "UNKNOWN"),
        companyId: j.companyId ?? "",
        companySlug: j.companyUser?.companySlug ?? null,
        organizationId: j.organizationId ?? null,
        recruiterName: j.companyUser?.name ?? "Unknown",
        applicationCount: j._count.applications,
        createdAt: j.createdAt ?? null,
    }));

    // Build recruiter job counts
    const jobCounts = new Map<string, {
        totalJobs: number;
        activeJobs: number;
        draftJobs: number;
        closedJobs: number;
        archivedJobs: number;
        totalApplications: number;
        latestJobAt: Date | null;
        jobs: RecruiterSummary["jobs"];
    }>();

    for (const job of jobs) {
        if (!job.companyId) continue;
        const c = jobCounts.get(job.companyId) ?? {
            totalJobs: 0, activeJobs: 0, draftJobs: 0, closedJobs: 0, archivedJobs: 0,
            totalApplications: 0, latestJobAt: null, jobs: [],
        };
        c.totalJobs += 1;
        c.totalApplications += job.applicationCount;
        if (job.status === "ACTIVE") c.activeJobs += 1;
        if (job.status === "DRAFT") c.draftJobs += 1;
        if (job.status === "CLOSED") c.closedJobs += 1;
        if (job.status === "ARCHIVED") c.archivedJobs += 1;
        if (job.createdAt && (!c.latestJobAt || job.createdAt > c.latestJobAt)) c.latestJobAt = job.createdAt;
        c.jobs.push({
            id: job.id, title: job.title, company: job.company,
            companySlug: job.companySlug, status: job.status,
            applicationCount: job.applicationCount, createdAt: job.createdAt,
        });
        jobCounts.set(job.companyId, c);
    }

    const recruiters: RecruiterSummary[] = rawUsers
        .filter((u) => u.userRole === UserRole.RECRUITER)
        .map((u) => {
            const c = jobCounts.get(u.id);
            return {
                id: u.id,
                email: u.email ?? "No email",
                name: u.name ?? "Unnamed User",
                isAdmin: u.isAdmin ?? false,
                companySlug: u.companySlug ?? null,
                companyName: u.companyName ?? null,
                organizationId: u.organizationId ?? null,
                organizationSlug: u.organization?.slug ?? null,
                createdAt: u.createdAt ?? null,
                totalJobs: c?.totalJobs ?? 0,
                activeJobs: c?.activeJobs ?? 0,
                draftJobs: c?.draftJobs ?? 0,
                closedJobs: c?.closedJobs ?? 0,
                archivedJobs: c?.archivedJobs ?? 0,
                totalApplications: c?.totalApplications ?? 0,
                latestJobAt: c?.latestJobAt ?? null,
                jobs: (c?.jobs ?? []).sort(
                    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
                ),
            };
        })
        .sort((a, b) => b.totalJobs - a.totalJobs);

    const applications: AdminDashboardApplication[] = rawApplications.map((a) => ({
        id: a.id,
        candidateId: a.candidateId,
        candidateName: a.candidate?.name ?? "Unknown",
        candidateEmail: a.candidate?.email ?? "N/A",
        jobId: a.jobId,
        jobTitle: a.job?.title ?? "Untitled Job",
        company: a.job?.company ?? "Unknown Company",
        companySlug: a.job?.companyUser?.companySlug ?? null,
        status: String(a.status ?? "UNKNOWN"),
        appliedAt: a.appliedAt ?? null,
        resumeUrl: a.resumeUrl ?? "",
    }));

    const now = new Date();
    const leads: AdminDashboardLead[] = rawLeads.map((lead) => {
        const { meetAt, meetKind } = pickLeadMeetSummary(lead.booking, now);
        const created = lead.createdAt ?? null;
        const isNew = created ? created.getTime() >= weekAgo.getTime() : false;
        return {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            company: lead.company,
            phone: lead.phone ?? null,
            rolesSnippet: snippet(lead.roles),
            createdAt: created,
            meetAt,
            meetKind,
            isNew,
            confirmedBookingCount: lead.booking.length,
        };
    });

    return {
        users,
        recruiters,
        jobs,
        applications,
        leads,
        stats: {
            totalUsers: totalUsersCount,
            totalCandidates: totalCandidatesCount,
            totalRecruiters: totalRecruitersCount,
            recruitersWithPosts: recruitersWithPostsCount,
            totalJobs: totalJobsCount,
            activeJobs: activeJobsCount,
            totalApplications: totalApplicationsCount,
            totalLeads: totalLeadsCount,
            newLeadsLast7Days: newLeadsLast7dCount,
            leadsWithUpcomingMeet: upcomingMeetLeadGroups.length,
        },
    };
}

/* ═══════════════════════════════════════════════════════════════════════
   USER PROFILE DATA (single user)
   ═══════════════════════════════════════════════════════════════════════ */

export async function getAdminUserProfileData(userId: string) {
    const rawUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true, email: true, name: true, userRole: true,
            profileImageUrl: true, roleSelectedAt: true, phoneNumber: true,
            country: true, state: true, city: true,
            linkedin: true, github: true, twitter: true,
            currentCTC: true, expectedCTC: true, noticePeriod: true,
            resumeUrl: true, companySlug: true, companyName: true,
            organizationId: true,
            notificationNewApplications: true, notificationInterviewUpdates: true,
            notificationPlatformNews: true,
            createdAt: true, updatedAt: true,
        },
    });

    if (!rawUser) return null;

    const jobWhere: Prisma.JobWhereInput = rawUser.organizationId
        ? {
              OR: [{ organizationId: rawUser.organizationId }, { companyId: userId }],
          }
        : { companyId: userId };

    const [rawJobs, rawApplications] = await Promise.all([
        prisma.job.findMany({
            where: jobWhere,
            orderBy: { createdAt: "desc" },
            select: {
                id: true, title: true, company: true, location: true,
                status: true, companyId: true, organizationId: true, createdAt: true,
                companyUser: { select: { companySlug: true } },
                _count: { select: { applications: true } },
            },
        }),
        prisma.application.findMany({
            where: { candidateId: userId },
            orderBy: { appliedAt: "desc" },
            select: {
                id: true, jobId: true, companyId: true,
                resumeUrl: true, motivation: true,
                currentCTC: true, expectedCTC: true,
                currentCurrency: true, expectedCurrency: true,
                noticePeriod: true, city: true, status: true,
                appliedAt: true, interviewScheduledAt: true,
                job: {
                    select: {
                        id: true, title: true, company: true, location: true, status: true,
                        companyUser: { select: { companySlug: true } },
                    },
                },
            },
        }),
    ]);

    const user: AdminUserProfile = {
        id: rawUser.id,
        email: rawUser.email ?? "No email",
        name: rawUser.name ?? "Unnamed User",
        userRole: String(rawUser.userRole ?? "UNKNOWN"),
        profileImageUrl: rawUser.profileImageUrl ?? "",
        roleSelectedAt: rawUser.roleSelectedAt ?? null,
        phoneNumber: rawUser.phoneNumber ?? "",
        country: rawUser.country ?? "",
        state: rawUser.state ?? "",
        city: rawUser.city ?? "",
        linkedin: rawUser.linkedin ?? "",
        github: rawUser.github ?? "",
        twitter: rawUser.twitter ?? "",
        currentCTC: rawUser.currentCTC ?? "",
        expectedCTC: rawUser.expectedCTC ?? "",
        noticePeriod: rawUser.noticePeriod ?? "",
        resumeUrl: rawUser.resumeUrl ?? "",
        companySlug: rawUser.companySlug ?? null,
        companyName: rawUser.companyName ?? null,
        notificationNewApplications: rawUser.notificationNewApplications ?? null,
        notificationInterviewUpdates: rawUser.notificationInterviewUpdates ?? null,
        notificationPlatformNews: rawUser.notificationPlatformNews ?? null,
        createdAt: rawUser.createdAt ?? null,
        updatedAt: rawUser.updatedAt ?? null,
    };

    const jobs: AdminJob[] = rawJobs.map((j) => ({
        id: j.id,
        title: j.title ?? "Untitled Job",
        company: j.company ?? "Unknown Company",
        location: j.location ?? "N/A",
        status: String(j.status ?? "UNKNOWN"),
        companyId: j.companyId ?? "",
        companySlug: j.companyUser?.companySlug ?? null,
        organizationId: j.organizationId ?? null,
        recruiterName: user.name,
        applicationCount: j._count.applications,
        createdAt: j.createdAt ?? null,
    }));

    const applications: AdminApplication[] = rawApplications.map((a) => ({
        id: a.id, jobId: a.jobId, companyId: a.companyId,
        resumeUrl: a.resumeUrl ?? "", motivation: a.motivation ?? "",
        currentCTC: a.currentCTC ?? "", expectedCTC: a.expectedCTC ?? "",
        currentCurrency: a.currentCurrency ?? "", expectedCurrency: a.expectedCurrency ?? "",
        noticePeriod: a.noticePeriod ?? "", city: a.city ?? "",
        status: String(a.status ?? "UNKNOWN"),
        appliedAt: a.appliedAt ?? null, interviewScheduledAt: a.interviewScheduledAt ?? null,
        job: a.job ? {
            id: a.job.id, title: a.job.title, company: a.job.company,
            location: a.job.location, status: String(a.job.status),
            companySlug: (a.job as { companyUser?: { companySlug?: string | null } }).companyUser?.companySlug ?? null,
        } : null,
    }));

    return {
        user, jobs, applications,
        stats: {
            totalApplications: applications.length,
            shortlisted: applications.filter((a) => a.status === "SHORTLISTED").length,
            interviews: applications.filter((a) => a.status === "INTERVIEW").length,
            hired: applications.filter((a) => a.status === "HIRED").length,
            totalJobsPosted: jobs.length,
            activeJobsPosted: jobs.filter((j) => j.status === "ACTIVE").length,
            totalAppsReceived: jobs.reduce((sum, j) => sum + j.applicationCount, 0),
        },
    };
}
