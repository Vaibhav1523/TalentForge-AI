export type AdminRecruiterFilterRow = {
    id: string;
    name: string;
    companyName: string;
    companySlug: string | null;
    organizationId: string | null;
    organizationSlug: string | null;
};

export function companyKeyForRecruiter(r: AdminRecruiterFilterRow): string {
    const org = r.organizationSlug?.trim();
    if (org) return org;
    const slug = r.companySlug?.trim();
    if (slug) return slug;
    return `__recruiter__${r.id}`;
}

export function buildCompanyOptions(recruiters: AdminRecruiterFilterRow[]): { key: string; label: string }[] {
    const map = new Map<string, string>();
    for (const r of recruiters) {
        const key = companyKeyForRecruiter(r);
        const label = (r.companyName && r.companyName.trim()) || r.name || "Unnamed company";
        if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries())
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

/** Comma-separated admin filter params (recruiterId / jobId) for multi-select. */
export function parseAdminIdListParam(raw: string | undefined | null): string[] {
    if (raw == null || raw === "") return [];
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

export function serializeAdminIdList(ids: string[]): string {
    return ids.join(",");
}

export function recruiterIdsForCompanyKey(
    recruiters: AdminRecruiterFilterRow[],
    companyKey: string,
): string[] {
    const key = companyKey.trim();
    if (!key) return [];
    return recruiters.filter((r) => companyKeyForRecruiter(r) === key).map((r) => r.id);
}

/** Distinct organization ids for recruiters grouped under this company key (multi-recruiter orgs). */
export function organizationIdsForCompanyKey(
    recruiters: AdminRecruiterFilterRow[],
    companyKey: string,
): string[] {
    const trimmedCompanyKey = companyKey.trim();
    if (!trimmedCompanyKey) return [];
    const set = new Set<string>();
    for (const r of recruiters) {
        if (companyKeyForRecruiter(r) === trimmedCompanyKey && r.organizationId) {
            set.add(r.organizationId);
        }
    }
    return Array.from(set);
}

/** Union of poster user ids for all given company keys. */
export function recruiterIdsForCompanyKeys(
    recruiters: AdminRecruiterFilterRow[],
    companyKeys: string[],
): string[] {
    const keys = companyKeys.map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) return [];
    const set = new Set<string>();
    for (const ck of keys) {
        for (const id of recruiterIdsForCompanyKey(recruiters, ck)) {
            set.add(id);
        }
    }
    return Array.from(set);
}

/** Union of organization ids for all given company keys. */
export function organizationIdsForCompanyKeys(
    recruiters: AdminRecruiterFilterRow[],
    companyKeys: string[],
): string[] {
    const keys = companyKeys.map((k) => k.trim()).filter(Boolean);
    const set = new Set<string>();
    for (const ck of keys) {
        for (const id of organizationIdsForCompanyKey(recruiters, ck)) {
            set.add(id);
        }
    }
    return Array.from(set);
}

/** Client + API payload: recruiter row with stable company key for pruning. */
export type CascadeRecruiterRow = {
    id: string;
    name: string;
    companyName: string;
    companyKey: string;
};

export function toCascadeRecruiterRows(recruiters: AdminRecruiterFilterRow[]): CascadeRecruiterRow[] {
    return recruiters.map((r) => ({
        id: r.id,
        name: r.name,
        companyName: r.companyName,
        companyKey: companyKeyForRecruiter(r),
    }));
}

/**
 * Mini job rows for admin dropdowns — same scope rules as {@link filterAdminJobsList}.
 * `companyKeys` empty = no company restriction (until recruiter/job filters apply).
 */
export function filterAdminJobsMiniByScope<
    T extends { id: string; companyId: string; organizationId?: string | null },
>(
    mini: T[],
    recruiters: AdminRecruiterFilterRow[],
    companyKeys: string[],
    recruiterIds: string[],
    jobIds: string[],
): T[] {
    if (jobIds.length > 0) {
        const want = new Set(jobIds);
        return mini.filter((j) => want.has(j.id));
    }
    if (recruiterIds.length > 0) {
        const sel = new Set(recruiterIds);
        const matching = recruiters.filter((r) => sel.has(r.id));
        const posterIds = new Set(matching.map((r) => r.id));
        const orgIds = new Set(matching.map((r) => r.organizationId).filter((x): x is string => !!x));
        return mini.filter(
            (j) =>
                posterIds.has(j.companyId) || (!!j.organizationId && orgIds.has(j.organizationId)),
        );
    }
    const keys = companyKeys.map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) return mini;
    const matching = recruiters.filter((r) =>
        keys.some((ck) => companyKeyForRecruiter(r) === ck),
    );
    const posterIds = new Set(matching.map((r) => r.id));
    const orgIds = new Set(matching.map((r) => r.organizationId).filter((x): x is string => !!x));
    return mini.filter(
        (j) =>
            posterIds.has(j.companyId) ||
            (!!j.organizationId && orgIds.has(j.organizationId)),
    );
}
