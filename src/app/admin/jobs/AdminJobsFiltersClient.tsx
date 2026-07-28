"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminScopeCascadeFields } from "@/components/admin/AdminScopeCascadeFields";
import { AdminExportExcelButton } from "@/components/admin/AdminExportExcelButton";
import { serializeAdminIdList } from "@/lib/admin/admin-filter-helpers";
import type { CascadeRecruiterRow } from "@/lib/admin/admin-filter-helpers";
import {
    buildAdminJobsExportQuery,
    buildAdminJobsHref,
    type AdminJobsAppsFilter,
} from "@/lib/admin/admin-jobs-nav";

type CascadeJobOption = { id: string; title: string; company: string };

function serializeScope(companyKeys: string[], recruiterIds: string[], jobIds: string[]) {
    return {
        companyKey: serializeAdminIdList(companyKeys),
        recruiterId: serializeAdminIdList(recruiterIds),
        jobId: serializeAdminIdList(jobIds),
    };
}

type Props = {
    companyOptions: { key: string; label: string }[];
    initialCompanyKeys: string[];
    initialRecruiterIds: string[];
    initialJobIds: string[];
    initialRecruiters: CascadeRecruiterRow[];
    initialJobs: CascadeJobOption[];
    orphanJobs: CascadeJobOption[];
    initialQ: string;
    activeStatus: string;
    appsFilter: AdminJobsAppsFilter;
    sort: string;
    dir: string;
    pageSize: number;
    hasActiveFilters: boolean;
};

export function AdminJobsFiltersClient({
    companyOptions,
    initialCompanyKeys,
    initialRecruiterIds,
    initialJobIds,
    initialRecruiters,
    initialJobs,
    orphanJobs,
    initialQ,
    activeStatus,
    appsFilter,
    sort,
    dir,
    pageSize,
    hasActiveFilters,
}: Props) {
    const router = useRouter();
    const [q, setQ] = useState(initialQ);
    const qRef = useRef(q);
    qRef.current = q;

    useEffect(() => {
        setQ(initialQ);
    }, [initialQ]);

    const scopeRef = useRef(serializeScope(initialCompanyKeys, initialRecruiterIds, initialJobIds));
    const [exportScope, setExportScope] = useState(() =>
        serializeScope(initialCompanyKeys, initialRecruiterIds, initialJobIds),
    );

    useEffect(() => {
        const next = serializeScope(initialCompanyKeys, initialRecruiterIds, initialJobIds);
        scopeRef.current = next;
        setExportScope(next);
    }, [initialCompanyKeys, initialRecruiterIds, initialJobIds]);

    const cascadeKey = useMemo(
        () =>
            [
                initialCompanyKeys.join(","),
                initialRecruiterIds.join(","),
                initialJobIds.join(","),
            ].join("|"),
        [initialCompanyKeys, initialRecruiterIds, initialJobIds],
    );

    const handleScopeChange = useCallback(
        (serialized: { companyKey: string; recruiterId: string; jobId: string }) => {
            scopeRef.current = serialized;
            setExportScope(serialized);
            router.push(
                buildAdminJobsHref({
                    status: activeStatus,
                    apps: appsFilter,
                    sort,
                    dir,
                    page: 1,
                    pageSize,
                    q: qRef.current,
                    companyKey: serialized.companyKey,
                    recruiterId: serialized.recruiterId,
                    jobId: serialized.jobId,
                }),
            );
        },
        [router, activeStatus, appsFilter, sort, dir, pageSize],
    );

    const skipFirstQNav = useRef(true);
    useEffect(() => {
        if (skipFirstQNav.current) {
            skipFirstQNav.current = false;
            return;
        }
        const id = window.setTimeout(() => {
            const s = scopeRef.current;
            router.push(
                buildAdminJobsHref({
                    status: activeStatus,
                    apps: appsFilter,
                    sort,
                    dir,
                    page: 1,
                    pageSize,
                    q,
                    companyKey: s.companyKey,
                    recruiterId: s.recruiterId,
                    jobId: s.jobId,
                }),
            );
        }, 400);
        return () => window.clearTimeout(id);
    }, [q, router, activeStatus, appsFilter, sort, dir, pageSize]);

    const exportQuery = buildAdminJobsExportQuery({
        status: activeStatus,
        apps: appsFilter,
        q,
        sort,
        dir,
        companyKey: exportScope.companyKey,
        recruiterId: exportScope.recruiterId,
        jobId: exportScope.jobId,
    });

    return (
        <div className="filter-form" style={{ marginBottom: 12 }}>
            <div
                style={{
                    display: "grid",
                    gap: 12,
                    marginTop: 12,
                }}
            >
                <div style={{ gridColumn: "1 / -1" }}>
                    <AdminScopeCascadeFields
                        key={cascadeKey}
                        companyOptions={companyOptions}
                        initialCompanyKeys={initialCompanyKeys}
                        initialRecruiterIds={initialRecruiterIds}
                        initialJobIds={initialJobIds}
                        initialRecruiters={initialRecruiters}
                        initialJobs={initialJobs}
                        orphanJobs={orphanJobs}
                        companyLabel="1. Companies"
                        recruiterLabel="2. Recruiters"
                        jobLabel="3. Jobs (optional)"
                        onScopeChange={handleScopeChange}
                    />
                </div>
                <div className="filter-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="filter-label" htmlFor="admin-jobs-search-q">
                        Search
                    </label>
                    <input
                        id="admin-jobs-search-q"
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Job title, company, recruiter, location…"
                        className="control-input"
                        autoComplete="off"
                    />
                </div>
            </div>
            <p className="header-subtitle" style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }}>
                Scope and search update the list automatically (search is debounced briefly).
            </p>
            <div className="filter-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {hasActiveFilters && (
                    <Link href="/admin/jobs" className="btn">
                        Clear all
                    </Link>
                )}
                <AdminExportExcelButton
                    label="Download Excel"
                    endpoint="/api/admin/jobs/export"
                    query={exportQuery}
                    filenamePrefix="admin-jobs"
                    sheetName="Jobs"
                />
            </div>
        </div>
    );
}
