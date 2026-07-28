"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    Search,
    Download,
    Filter,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Building2,
    Users,
    Briefcase,
    ChevronDown,
} from "lucide-react";
import type { AdminRecruiterFilterRow } from "@/lib/admin/admin-filter-helpers";
import {
    buildCompanyOptions,
    companyKeyForRecruiter,
    filterAdminJobsMiniByScope,
    serializeAdminIdList,
} from "@/lib/admin/admin-filter-helpers";

type Candidate = {
    id: string;
    name: string;
    email: string;
    skills: string[];
    phoneNumber: string;
    linkedin: string;
    github: string;
    currentCTC: string;
    expectedCTC: string;
    currentCurrency: string;
    expectedCurrency: string;
    noticePeriod: string;
    city: string;
    state: string;
    country: string;
    jobLocation: string;
    appliedJobs: string;
    latestStatus: string;
    resumeUrl: string;
    applicationCount: number;
    createdAt: string | null;
};

type RecruiterOpt = AdminRecruiterFilterRow;

type JobOpt = {
    id: string;
    title: string;
    company: string;
    companyId: string;
    organizationId: string | null;
};

type Options = {
    recruiters: RecruiterOpt[];
    jobs: JobOpt[];
    allSkills: string[];
};

type Filters = {
    scope: "all" | "recruiter" | "job";
    companyKeys: string[];
    recruiterIds: string[];
    jobIds: string[];
    skills: string[];
    location: string;
    currency: string;
    minCTC: string;
    maxCTC: string;
};

const EMPTY_FILTERS: Filters = {
    scope: "all",
    companyKeys: [],
    recruiterIds: [],
    jobIds: [],
    skills: [],
    location: "",
    currency: "",
    minCTC: "",
    maxCTC: "",
};

const CURRENCY_OPTIONS = ["", "USD", "INR", "PHP", "EUR", "GBP", "AED", "SGD", "CAD", "AUD"] as const;

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const DEFAULT_PAGE_SIZE = 50;

function fmt(d: string | null) {
    if (!d) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(d));
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

export default function AdminCandidatesFilterPage() {
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [total, setTotal] = useState(0);
    const [options, setOptions] = useState<Options | null>(null);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [skillInput, setSkillInput] = useState("");
    const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestRef = useRef<HTMLDivElement>(null);
    const hasFetched = useRef(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const jobListLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [jobListPinned, setJobListPinned] = useState(false);
    const [jobListHover, setJobListHover] = useState(false);
    const jobListOpen = jobListPinned || jobListHover;

    function clearJobListLeaveTimer() {
        if (jobListLeaveTimerRef.current) {
            clearTimeout(jobListLeaveTimerRef.current);
            jobListLeaveTimerRef.current = null;
        }
    }

    function onJobPanelMouseEnter() {
        clearJobListLeaveTimer();
        setJobListHover(true);
    }

    function onJobPanelMouseLeave() {
        clearJobListLeaveTimer();
        jobListLeaveTimerRef.current = setTimeout(() => setJobListHover(false), 240);
    }

    useEffect(
        () => () => {
            clearJobListLeaveTimer();
        },
        []
    );

    function buildSearchParams(f: Filters) {
        const sp = new URLSearchParams();
        sp.set("scope", f.scope);
        if ((f.scope === "recruiter" || f.scope === "job") && f.companyKeys.length) {
            sp.set("companyKey", serializeAdminIdList(f.companyKeys));
        }
        if (f.scope === "recruiter" && f.recruiterIds.length) {
            sp.set("recruiterId", serializeAdminIdList(f.recruiterIds));
        }
        if (f.scope === "job") {
            if (f.recruiterIds.length) sp.set("recruiterId", serializeAdminIdList(f.recruiterIds));
            if (f.jobIds.length) sp.set("jobId", serializeAdminIdList(f.jobIds));
        }
        if (f.skills.length) sp.set("skills", f.skills.join(","));
        if (f.location) sp.set("location", f.location);
        if (f.currency) sp.set("currency", f.currency);
        if (f.minCTC) sp.set("minCTC", f.minCTC);
        if (f.maxCTC) sp.set("maxCTC", f.maxCTC);
        return sp;
    }

    const fetchCandidates = useCallback(
        async (f: Filters, p: number, ps: number = pageSize) => {
            setLoading(true);
            setError("");
            try {
                const sp = buildSearchParams(f);
                sp.set("page", String(p));
                sp.set("pageSize", String(ps));

                const res = await fetch(`/api/admin/candidates?${sp.toString()}`);
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Request failed (${res.status})`);
                }
                const data = await res.json();
                setCandidates(data.candidates ?? []);
                setTotal(data.total ?? 0);
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Unknown error";
                console.error("Fetch error:", msg);
                setError(msg);
                setCandidates([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setOptionsLoading(true);
            try {
                const res = await fetch("/api/admin/candidates/options");
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) setOptions(data as Options);
            } catch (e) {
                console.error("[admin/candidates] options load failed:", e);
            } finally {
                if (!cancelled) setOptionsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    /** At least one company is required for scoped modes; recruiters & jobs narrow the list but are optional. */
    const scopeIncomplete =
        (filters.scope === "recruiter" && filters.companyKeys.length === 0) ||
        (filters.scope === "job" && filters.companyKeys.length === 0);

    const companyOptions = useMemo(
        () => (options?.recruiters ? buildCompanyOptions(options.recruiters) : []),
        [options?.recruiters],
    );

    const recruitersForCompany = useMemo(() => {
        if (!options?.recruiters || filters.companyKeys.length === 0) return [];
        const keySet = new Set(filters.companyKeys);
        return options.recruiters.filter((r) => keySet.has(companyKeyForRecruiter(r)));
    }, [options?.recruiters, filters.companyKeys]);

    /** All jobs for the selected companies (optional recruiter checkboxes narrow this list). */
    const jobsInScope = useMemo(() => {
        if (!options?.jobs?.length || !options.recruiters?.length || filters.companyKeys.length === 0) return [];
        return filterAdminJobsMiniByScope(
            options.jobs,
            options.recruiters,
            filters.companyKeys,
            filters.recruiterIds,
            [],
        );
    }, [options?.jobs, options?.recruiters, filters.companyKeys, filters.recruiterIds]);

    const [recruiterScopeQuery, setRecruiterScopeQuery] = useState("");
    const [jobScopeQuery, setJobScopeQuery] = useState("");
    const [companyScopeQuery, setCompanyScopeQuery] = useState("");
    const [companyListOpen, setCompanyListOpen] = useState(false);
    const companyScopeSearchRef = useRef<HTMLInputElement>(null);

    const filteredCompanyOptions = useMemo(() => {
        const q = companyScopeQuery.trim().toLowerCase();
        if (!q) return companyOptions;
        return companyOptions.filter((c) => c.label.toLowerCase().includes(q));
    }, [companyOptions, companyScopeQuery]);

    const selectedCompanySummaryTitle = useMemo(() => {
        if (filters.companyKeys.length === 0) return "";
        return filters.companyKeys
            .map((key) => companyOptions.find((c) => c.key === key)?.label ?? key)
            .join(" · ");
    }, [filters.companyKeys, companyOptions]);

    const filteredRecruitersForScope = useMemo(() => {
        const q = recruiterScopeQuery.trim().toLowerCase();
        if (!q) return recruitersForCompany;
        return recruitersForCompany.filter((r) => {
            const blob = `${r.name} ${r.companyName ?? ""}`.toLowerCase();
            return blob.includes(q);
        });
    }, [recruitersForCompany, recruiterScopeQuery]);

    const filteredJobsForScope = useMemo(() => {
        const q = jobScopeQuery.trim().toLowerCase();
        if (!q) return jobsInScope;
        return jobsInScope.filter((j) => {
            const blob = `${j.title} ${j.company}`.toLowerCase();
            return blob.includes(q);
        });
    }, [jobsInScope, jobScopeQuery]);

    useEffect(() => {
        setRecruiterScopeQuery("");
    }, [filters.companyKeys.join(",")]);

    useEffect(() => {
        setJobScopeQuery("");
    }, [filters.companyKeys.join(","), filters.recruiterIds.join(",")]);

    useEffect(() => {
        setCompanyScopeQuery("");
        setCompanyListOpen(false);
    }, [filters.scope]);

    useEffect(() => {
        if (jobListLeaveTimerRef.current) {
            clearTimeout(jobListLeaveTimerRef.current);
            jobListLeaveTimerRef.current = null;
        }
        setJobListPinned(false);
        setJobListHover(false);
    }, [filters.companyKeys.join(","), filters.recruiterIds.join(","), filters.scope]);

    useEffect(() => {
        if (scopeIncomplete) {
            setCandidates([]);
            setTotal(0);
            setLoading(false);
            setError("");
            return;
        }

        if (!hasFetched.current) {
            hasFetched.current = true;
            fetchCandidates(filters, 1);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            fetchCandidates(filters, 1, pageSize);
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        filters.scope,
        filters.companyKeys.join(","),
        filters.recruiterIds.join(","),
        filters.jobIds.join(","),
        filters.skills,
        filters.location,
        filters.currency,
        filters.minCTC,
        filters.maxCTC,
    ]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handleApplyFilters() {
        if (filters.scope === "recruiter" || filters.scope === "job") {
            if (filters.companyKeys.length === 0) {
                setError("Please select at least one company first.");
                return;
            }
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setPage(1);
        fetchCandidates(filters, 1, pageSize);
    }

    function handleFilterKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            e.preventDefault();
            handleApplyFilters();
        }
    }

    function handleReset() {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
        setFilters(EMPTY_FILTERS);
        setSkillInput("");
        setPage(1);
        setPageSize(DEFAULT_PAGE_SIZE);
        fetchCandidates(EMPTY_FILTERS, 1, DEFAULT_PAGE_SIZE);
    }

    function handlePageChange(newPage: number) {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
        setPage(newPage);
        fetchCandidates(filters, newPage, pageSize);
    }

    function handlePageSizeChange(newSize: number) {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
        setPageSize(newSize);
        setPage(1);
        fetchCandidates(filters, 1, newSize);
    }

    function addSkill(skill: string) {
        const s = skill.trim();
        if (!s || filters.skills.includes(s)) return;
        setFilters((prev) => ({ ...prev, skills: [...prev.skills, s] }));
        setSkillInput("");
        setShowSuggestions(false);
    }

    function removeSkill(skill: string) {
        setFilters((prev) => ({
            ...prev,
            skills: prev.skills.filter((s) => s !== skill),
        }));
    }

    function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addSkill(skillInput);
        }
    }

    function handleSkillInputChange(val: string) {
        setSkillInput(val);
        if (val.trim() && options?.allSkills) {
            const match = options.allSkills.filter(
                (s) =>
                    s.toLowerCase().includes(val.toLowerCase()) &&
                    !filters.skills.includes(s)
            );
            setSkillSuggestions(match.slice(0, 8));
            setShowSuggestions(match.length > 0);
        } else {
            setShowSuggestions(false);
        }
    }

    function candidateToRow(c: Candidate) {
        return {
            Name: c.name,
            Email: c.email,
            Phone: c.phoneNumber,
            Skills: c.skills.join(", "),
            "Current CTC": c.currentCTC,
            "Current Currency": c.currentCurrency,
            "Expected CTC": c.expectedCTC,
            "Expected Currency": c.expectedCurrency,
            "Notice Period": c.noticePeriod,
            City: c.city,
            State: c.state,
            Country: c.country,
            "Job Location": c.jobLocation,
            "Applied Jobs": c.appliedJobs,
            "Latest Status": c.latestStatus,
            LinkedIn: c.linkedin,
            GitHub: c.github,
            Resume: c.resumeUrl ? `${window.location.origin}/api/resume/view?url=${encodeURIComponent(c.resumeUrl)}` : "",
            Applications: c.applicationCount,
            "Joined Date": c.createdAt ? fmt(c.createdAt) : "N/A",
        };
    }

    function buildWorkbook(XLSX: typeof import("xlsx"), rows: ReturnType<typeof candidateToRow>[]) {
        const ws = XLSX.utils.json_to_sheet(rows);
        const colWidths = Object.keys(rows[0]).map((key) => {
            const maxLen = Math.max(
                key.length,
                ...rows.map((r) => String(r[key as keyof typeof r] ?? "").length)
            );
            return { wch: Math.min(maxLen + 2, 50) };
        });
        ws["!cols"] = colWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Candidates");
        return wb;
    }

    function exportFilename() {
        const scopeLabel =
            filters.scope === "recruiter"
                ? `recruiter-${filters.recruiterIds.map((id) => id.slice(-6)).join("-") || "none"}`
                : filters.scope === "job"
                  ? `job-${filters.jobIds.map((id) => id.slice(-6)).join("-") || "none"}`
                  : "all";
        return `candidates-${scopeLabel}-${Date.now()}.xlsx`;
    }

    async function handleDownloadExcel() {
        const XLSX = await import("xlsx");
        const rows = candidates.map(candidateToRow);
        if (rows.length === 0) return;

        const wb = buildWorkbook(XLSX, rows);
        XLSX.writeFile(wb, exportFilename());
    }

    async function handleDownloadAllExcel() {
        const XLSX = await import("xlsx");

        const sp = buildSearchParams(filters);
        sp.set("page", "1");
        sp.set("pageSize", String(total));
        sp.set("export", "true");

        try {
            const res = await fetch(`/api/admin/candidates?${sp.toString()}`);
            if (!res.ok) throw new Error(`Export fetch failed (${res.status})`);
            const data = await res.json();

            const rows = ((data.candidates ?? []) as Candidate[]).map(candidateToRow);
            if (rows.length === 0) {
                setError("No candidates to export.");
                return;
            }

            const wb = buildWorkbook(XLSX, rows);
            XLSX.writeFile(wb, exportFilename());
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            console.error("Export error:", err);
            setError(`Export failed: ${msg}`);
        }
    }

    const totalPages = Math.ceil(total / pageSize);
    const hasActiveFilters =
        filters.skills.length > 0 ||
        filters.location ||
        filters.currency ||
        filters.minCTC ||
        filters.maxCTC ||
        filters.scope !== "all";

    return (
        <div className="page-shell">
            <div className="page-wrap">
                {/* Header */}
                <section className="header-card">
                    <h1 className="header-title">Candidate Search</h1>
                    <p className="header-subtitle">
                        Filter and export candidates by skills, CTC, location, and more
                    </p>
                </section>

                {/* Scope Selector */}
                <section className="panel panel--toolbar-first">
                    <div className="toolbar">
                        <h2 className="row-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Filter size={15} />
                            Search Scope
                        </h2>
                    </div>

                    <div className="admin-candidate-scope-tabs" role="tablist" aria-label="Search scope">
                        {(["all", "recruiter", "job"] as const).map((s) => (
                            <button
                                key={s}
                                className={`btn ${filters.scope === s ? "primary" : ""}`}
                                type="button"
                                role="tab"
                                aria-selected={filters.scope === s}
                                onClick={() =>
                                    setFilters((prev) => {
                                        if (s === "all") {
                                            return {
                                                ...prev,
                                                scope: "all",
                                                companyKeys: [],
                                                recruiterIds: [],
                                                jobIds: [],
                                            };
                                        }
                                        if (s === "recruiter") {
                                            if (prev.scope === "job") {
                                                return { ...prev, scope: "recruiter", jobIds: [] };
                                            }
                                            return {
                                                ...prev,
                                                scope: "recruiter",
                                                companyKeys: [],
                                                recruiterIds: [],
                                                jobIds: [],
                                            };
                                        }
                                        if (prev.scope === "recruiter") {
                                            return { ...prev, scope: "job", jobIds: [] };
                                        }
                                        return {
                                            ...prev,
                                            scope: "job",
                                            companyKeys: [],
                                            recruiterIds: [],
                                            jobIds: [],
                                        };
                                    })
                                }
                            >
                                {s === "all" && "Entire Database"}
                                {s === "recruiter" && "By Recruiter"}
                                {s === "job" && "By Job"}
                            </button>
                        ))}
                    </div>

                    {optionsLoading && filters.scope !== "all" && (
                        <p className="header-subtitle" style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }}>
                            Loading companies and jobs…
                        </p>
                    )}

                    {(filters.scope === "recruiter" || filters.scope === "job") && (
                        <div
                            className={`admin-candidate-scope-columns ${
                                filters.scope === "job"
                                    ? "admin-candidate-scope-columns--three"
                                    : "admin-candidate-scope-columns--two"
                            }`}
                        >
                            <div className="admin-candidate-scope-card admin-candidate-scope-card--company filter-field admin-candidate-company-scope">
                                <div className="admin-candidate-scope-card-head">
                                    <span className="admin-candidate-scope-orb admin-candidate-scope-orb--green">
                                        <Building2 size={16} strokeWidth={2} aria-hidden />
                                    </span>
                                    <div className="admin-candidate-scope-card-head-text">
                                        <span className="admin-candidate-scope-eyebrow">Step 1</span>
                                        <span className="admin-candidate-scope-title">Companies</span>
                                    </div>
                                </div>
                                <p className="admin-candidate-scope-lead">
                                    Open the list to tick one or more organisations. Results include candidates from
                                    any of them.
                                </p>
                                <button
                                    type="button"
                                    className={`admin-candidate-company-toggle ${companyListOpen ? "admin-candidate-company-toggle--open" : ""}`}
                                    aria-expanded={companyListOpen}
                                    title={selectedCompanySummaryTitle || undefined}
                                    disabled={optionsLoading || companyOptions.length === 0}
                                    onClick={() => {
                                        setCompanyListOpen((o) => {
                                            const next = !o;
                                            if (next) {
                                                window.requestAnimationFrame(() => {
                                                    companyScopeSearchRef.current?.focus();
                                                });
                                            }
                                            return next;
                                        });
                                    }}
                                >
                                    <span className="admin-candidate-company-toggle-text">
                                        {filters.companyKeys.length === 0
                                            ? "Choose companies…"
                                            : `${filters.companyKeys.length} selected — click to add or remove`}
                                    </span>
                                    <ChevronDown
                                        className="admin-candidate-company-toggle-chevron"
                                        size={18}
                                        strokeWidth={2}
                                        aria-hidden
                                    />
                                </button>
                                {companyListOpen ? (
                                    <div className="admin-candidate-company-panel">
                                        <input
                                            ref={companyScopeSearchRef}
                                            type="search"
                                            className="control-input admin-candidate-scope-search"
                                            placeholder={
                                                companyOptions.length > 8
                                                    ? "Filter companies…"
                                                    : "Optional — filter this list…"
                                            }
                                            value={companyScopeQuery}
                                            disabled={optionsLoading}
                                            onChange={(e) => setCompanyScopeQuery(e.target.value)}
                                            aria-label="Filter company list"
                                        />
                                        <div className="admin-scope-job-toolbar-actions" style={{ marginTop: 8 }}>
                                            <button
                                                type="button"
                                                className="btn"
                                                disabled={
                                                    optionsLoading ||
                                                    filteredCompanyOptions.length === 0 ||
                                                    filteredCompanyOptions.every((c) =>
                                                        filters.companyKeys.includes(c.key)
                                                    )
                                                }
                                                onClick={() =>
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        companyKeys: Array.from(
                                                            new Set([
                                                                ...prev.companyKeys,
                                                                ...filteredCompanyOptions.map((c) => c.key),
                                                            ])
                                                        ),
                                                        recruiterIds: [],
                                                        jobIds: [],
                                                    }))
                                                }
                                            >
                                                Select filtered
                                            </button>
                                            <button
                                                type="button"
                                                className="btn"
                                                disabled={optionsLoading || filters.companyKeys.length === 0}
                                                onClick={() =>
                                                    setFilters((prev) => ({
                                                        ...prev,
                                                        companyKeys: [],
                                                        recruiterIds: [],
                                                        jobIds: [],
                                                    }))
                                                }
                                            >
                                                Clear companies
                                            </button>
                                        </div>
                                        <div
                                            className={`admin-scope-multi ${
                                                companyOptions.length > 5 ? "admin-scope-multi--scroll" : ""
                                            }`}
                                        >
                                            {companyOptions.length === 0 ? (
                                                <span className="muted" style={{ fontSize: 13 }}>
                                                    No companies loaded
                                                </span>
                                            ) : filteredCompanyOptions.length === 0 ? (
                                                <span className="muted" style={{ fontSize: 13 }}>
                                                    No companies match your filter.
                                                </span>
                                            ) : (
                                                filteredCompanyOptions.map((c) => (
                                                    <label
                                                        key={c.key}
                                                        className="admin-scope-check-card admin-scope-check-card--compact"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="admin-scope-check-input"
                                                            disabled={optionsLoading}
                                                            checked={filters.companyKeys.includes(c.key)}
                                                            onChange={(e) => {
                                                                const on = e.target.checked;
                                                                setFilters((prev) => {
                                                                    const keys = new Set(prev.companyKeys);
                                                                    if (on) keys.add(c.key);
                                                                    else keys.delete(c.key);
                                                                    const companyKeys = Array.from(keys);
                                                                    const recruitersAll =
                                                                        options?.recruiters ?? [];
                                                                    const keySet = new Set(companyKeys);
                                                                    const allowedIds = new Set(
                                                                        recruitersAll
                                                                            .filter((r) =>
                                                                                keySet.has(
                                                                                    companyKeyForRecruiter(r)
                                                                                )
                                                                            )
                                                                            .map((r) => r.id)
                                                                    );
                                                                    const recruiterIds = prev.recruiterIds.filter(
                                                                        (id) => allowedIds.has(id)
                                                                    );
                                                                    return {
                                                                        ...prev,
                                                                        companyKeys,
                                                                        recruiterIds,
                                                                        jobIds: [],
                                                                    };
                                                                });
                                                            }}
                                                        />
                                                        <span className="admin-scope-check-body">
                                                            <span className="admin-scope-check-title">{c.label}</span>
                                                        </span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="admin-candidate-scope-card admin-candidate-scope-card--recruiters filter-field">
                                <div className="admin-candidate-scope-card-head">
                                    <span className="admin-candidate-scope-orb admin-candidate-scope-orb--cyan">
                                        <Users size={16} strokeWidth={2} aria-hidden />
                                    </span>
                                    <div className="admin-candidate-scope-card-head-text">
                                        <span className="admin-candidate-scope-eyebrow">Step 2</span>
                                        <span className="admin-candidate-scope-title">Recruiters</span>
                                    </div>
                                </div>
                                <p className="admin-candidate-scope-lead">
                                    {filters.companyKeys.length === 0
                                        ? "Select at least one company first."
                                        : "Optional — tick recruiters to narrow jobs & candidates. Leave none ticked to include all recruiters under the selected companies."}
                                </p>
                                {filters.companyKeys.length > 0 && recruitersForCompany.length > 0 ? (
                                    <input
                                        type="search"
                                        className="control-input admin-candidate-scope-search"
                                        placeholder="Filter recruiters…"
                                        value={recruiterScopeQuery}
                                        disabled={optionsLoading}
                                        onChange={(e) => setRecruiterScopeQuery(e.target.value)}
                                        aria-label="Filter recruiter list"
                                    />
                                ) : null}
                                <div
                                    className={`admin-scope-multi ${
                                        filters.companyKeys.length > 0 && recruitersForCompany.length > 4
                                            ? "admin-scope-multi--scroll"
                                            : ""
                                    }`}
                                >
                                    {filters.companyKeys.length === 0 ? (
                                        <span className="muted" style={{ fontSize: 13 }}>
                                            —
                                        </span>
                                    ) : recruitersForCompany.length === 0 ? (
                                        <span className="muted" style={{ fontSize: 13 }}>
                                            No recruiters for these companies
                                        </span>
                                    ) : filteredRecruitersForScope.length === 0 ? (
                                        <span className="muted" style={{ fontSize: 13 }}>
                                            No recruiters match your filter.
                                        </span>
                                    ) : (
                                        filteredRecruitersForScope.map((r) => (
                                            <label
                                                key={r.id}
                                                className="admin-scope-check-card admin-scope-check-card--compact"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="admin-scope-check-input"
                                                    disabled={optionsLoading}
                                                    checked={filters.recruiterIds.includes(r.id)}
                                                    onChange={(e) => {
                                                        const on = e.target.checked;
                                                        setFilters((prev) => {
                                                            const next = new Set(prev.recruiterIds);
                                                            if (on) next.add(r.id);
                                                            else next.delete(r.id);
                                                            return {
                                                                ...prev,
                                                                recruiterIds: Array.from(next),
                                                                jobIds: [],
                                                            };
                                                        });
                                                    }}
                                                />
                                                <span className="admin-scope-check-body">
                                                    <span className="admin-scope-check-title">{r.name}</span>
                                                    {r.companyName && r.companyName !== r.name ? (
                                                        <span className="admin-scope-check-sub">{r.companyName}</span>
                                                    ) : null}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            {filters.scope === "job" && (
                                <div className="admin-candidate-scope-card admin-candidate-scope-card--jobs filter-field">
                                    <div className="admin-candidate-scope-card-head">
                                        <span className="admin-candidate-scope-orb admin-candidate-scope-orb--purple">
                                            <Briefcase size={16} strokeWidth={2} aria-hidden />
                                        </span>
                                        <div className="admin-candidate-scope-card-head-text">
                                            <span className="admin-candidate-scope-eyebrow">Step 3</span>
                                            <span className="admin-candidate-scope-title">Jobs</span>
                                        </div>
                                    </div>
                                    <p className="admin-candidate-scope-lead">
                                        {filters.companyKeys.length === 0
                                            ? "Select at least one company first."
                                            : jobsInScope.length === 0
                                              ? filters.recruiterIds.length
                                                  ? "No jobs for the selected companies with the selected recruiter(s)."
                                                  : "No jobs found for the selected companies."
                                              : "Optional — tick specific jobs to narrow results. Leave none ticked to search candidates who applied to any job across the selected companies."}
                                    </p>
                                    {jobsInScope.length > 0 ? (
                                        <div
                                            className={`admin-scope-job-panel ${jobListOpen ? "admin-scope-job-panel--open" : ""}`}
                                            onMouseEnter={onJobPanelMouseEnter}
                                            onMouseLeave={onJobPanelMouseLeave}
                                        >
                                            <button
                                                type="button"
                                                className="admin-scope-job-summary"
                                                aria-expanded={jobListOpen}
                                                onClick={() => setJobListPinned((p) => !p)}
                                            >
                                                <span className="admin-scope-job-summary-main">
                                                    {filters.jobIds.length === 0
                                                        ? `All ${jobsInScope.length} job${jobsInScope.length === 1 ? "" : "s"} in scope`
                                                        : `${filters.jobIds.length} of ${jobsInScope.length} job${jobsInScope.length === 1 ? "" : "s"} selected`}
                                                    <span className="admin-scope-job-summary-hint">
                                                        {" "}
                                                        — hover to peek; click to pin open or close
                                                    </span>
                                                </span>
                                                <ChevronDown
                                                    className="admin-scope-job-summary-chevron"
                                                    size={18}
                                                    strokeWidth={2}
                                                    aria-hidden
                                                />
                                            </button>
                                            {jobListOpen ? (
                                            <div className="admin-scope-job-details-body">
                                                <div className="admin-scope-job-toolbar">
                                                    <input
                                                        type="search"
                                                        className="control-input admin-candidate-scope-search"
                                                        placeholder="Search jobs by title…"
                                                        value={jobScopeQuery}
                                                        disabled={optionsLoading}
                                                        onChange={(e) => setJobScopeQuery(e.target.value)}
                                                        aria-label="Filter job list"
                                                    />
                                                    <div className="admin-scope-job-toolbar-actions">
                                                        <button
                                                            type="button"
                                                            className="btn"
                                                            disabled={
                                                                optionsLoading || filteredJobsForScope.length === 0
                                                            }
                                                            onClick={() =>
                                                                setFilters((prev) => ({
                                                                    ...prev,
                                                                    jobIds: Array.from(
                                                                        new Set([
                                                                            ...prev.jobIds,
                                                                            ...filteredJobsForScope.map(
                                                                                (job) => job.id
                                                                            ),
                                                                        ])
                                                                    ),
                                                                }))
                                                            }
                                                        >
                                                            Select filtered
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn"
                                                            disabled={optionsLoading || filters.jobIds.length === 0}
                                                            onClick={() =>
                                                                setFilters((prev) => ({ ...prev, jobIds: [] }))
                                                            }
                                                        >
                                                            Clear jobs
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="admin-scope-job-meta">
                                                    Search runs automatically. Narrow by ticking jobs, or leave none
                                                    for all jobs across the selected companies.
                                                    {filteredJobsForScope.length !== jobsInScope.length
                                                        ? ` ${filteredJobsForScope.length} match your search filter.`
                                                        : null}
                                                </p>
                                                <div className="admin-scope-job-list" role="list">
                                                    {filteredJobsForScope.map((j) => (
                                                        <label
                                                            key={j.id}
                                                            className="admin-scope-check-card admin-scope-check-card--job-row"
                                                            role="listitem"
                                                            title={j.title}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="admin-scope-check-input"
                                                                disabled={optionsLoading}
                                                                checked={filters.jobIds.includes(j.id)}
                                                                onChange={(e) => {
                                                                    const on = e.target.checked;
                                                                    setFilters((prev) => {
                                                                        const next = new Set(prev.jobIds);
                                                                        if (on) next.add(j.id);
                                                                        else next.delete(j.id);
                                                                        return {
                                                                            ...prev,
                                                                            jobIds: Array.from(next),
                                                                        };
                                                                    });
                                                                }}
                                                            />
                                                            <span className="admin-scope-check-body">
                                                                <span className="admin-scope-check-title">
                                                                    {j.title}
                                                                </span>
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <span className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                                            —
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Filters */}
                <section className="panel">
                    <div className="toolbar" style={{ marginBottom: 0 }}>
                        <h2 className="row-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Filter size={15} />
                            Filters
                        </h2>
                    </div>

                    <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                        {/* Skills */}
                        <div className="filter-field" ref={suggestRef} style={{ position: "relative" }}>
                            <label className="filter-label">Skills</label>
                            {filters.skills.length > 0 && (
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                                    {filters.skills.map((s) => (
                                        <span key={s} className="skill-chip">
                                            {s}
                                            <button
                                                className="skill-chip-remove"
                                                onClick={() => removeSkill(s)}
                                                aria-label={`Remove ${s}`}
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <input
                                className="control-input"
                                placeholder="Type a skill and press Enter or comma…"
                                value={skillInput}
                                onChange={(e) => handleSkillInputChange(e.target.value)}
                                onKeyDown={handleSkillKeyDown}
                                onFocus={() => {
                                    if (skillInput.trim() && skillSuggestions.length)
                                        setShowSuggestions(true);
                                }}
                            />
                            {showSuggestions && skillSuggestions.length > 0 && (
                                <div className="skill-suggestions">
                                    {skillSuggestions.map((s) => (
                                        <button
                                            key={s}
                                            className="skill-suggestion-item"
                                            onClick={() => addSkill(s)}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Location + Currency + CTC range */}
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
                            <div className="filter-field">
                                <label className="filter-label">Location</label>
                                <input
                                    className="control-input"
                                    placeholder="e.g. Mumbai, Nigeria, Delhi"
                                    value={filters.location}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, location: e.target.value }))
                                    }
                                    onKeyDown={handleFilterKeyDown}
                                />
                            </div>
                            <div className="filter-field">
                                <label className="filter-label">Currency</label>
                                <select
                                    className="control-input"
                                    value={filters.currency}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, currency: e.target.value }))
                                    }
                                >
                                    <option value="">All Currencies</option>
                                    {CURRENCY_OPTIONS.filter(Boolean).map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="filter-field">
                                <label className="filter-label">Min CTC</label>
                                <input
                                    className="control-input"
                                    type="number"
                                    placeholder="e.g. 5000"
                                    value={filters.minCTC}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, minCTC: e.target.value }))
                                    }
                                    onKeyDown={handleFilterKeyDown}
                                />
                            </div>
                            <div className="filter-field">
                                <label className="filter-label">Max CTC</label>
                                <input
                                    className="control-input"
                                    type="number"
                                    placeholder="e.g. 50000"
                                    value={filters.maxCTC}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, maxCTC: e.target.value }))
                                    }
                                    onKeyDown={handleFilterKeyDown}
                                />
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="filter-actions" style={{ gap: 8, display: "flex", flexWrap: "wrap" }}>
                            <button className="btn primary" onClick={handleApplyFilters}>
                                <Search size={13} />
                                Search Candidates
                            </button>
                            {hasActiveFilters && (
                                <button className="btn" onClick={handleReset}>
                                    <X size={13} />
                                    Reset All
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Results */}
                <section className="panel">
                    <div className="toolbar">
                        <h2 className="row-title">
                            {loading
                                ? "Searching…"
                                : scopeIncomplete
                                  ? filters.scope === "job"
                                      ? "Choose a company to search (By Job)"
                                      : "Choose a company to search (By Recruiter)"
                                  : `${total} candidate${total !== 1 ? "s" : ""} found`}
                        </h2>
                        <div style={{ display: "flex", gap: 6 }}>
                            {totalPages > 1 && candidates.length > 0 && (
                                <button className="btn" onClick={handleDownloadExcel}>
                                    <Download size={13} />
                                    Download Page ({candidates.length})
                                </button>
                            )}
                            {total > 0 && (
                                <button className="btn primary" onClick={handleDownloadAllExcel}>
                                    <Download size={13} />
                                    Download All ({total})
                                </button>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div
                            className="empty-state"
                            style={{ borderColor: "rgba(247,110,138,0.2)", color: "var(--red)", marginBottom: 12 }}
                        >
                            Error: {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="empty-state">
                            <Loader2 size={28} className="spin-icon" />
                            <div style={{ marginTop: 8 }}>Loading candidates…</div>
                        </div>
                    ) : !error && candidates.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Search size={28} />
                            </div>
                            {scopeIncomplete ? (
                                filters.scope === "job" ? (
                                    <>
                                        Select a <strong>company</strong> above. Jobs appear immediately; results
                                        refresh automatically — no need to press Search unless you change skills or
                                        CTC filters.
                                    </>
                                ) : (
                                    <>
                                        Select a <strong>company</strong> above. Results include all candidates tied
                                        to that company&apos;s recruiters unless you narrow with ticks.
                                    </>
                                )
                            ) : hasActiveFilters ? (
                                "No candidates match your filters. Try broadening your search."
                            ) : (
                                "No candidates in the database yet."
                            )}
                        </div>
                    ) : (
                        <>
                            <div
                                className="jobs-table-wrap"
                                style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}
                            >
                                <table className="jobs-table">
                                    <thead>
                                        <tr>
                                            <th>Candidate</th>
                                            <th>Skills</th>
                                            <th>Current CTC</th>
                                            <th>Expected CTC</th>
                                            <th>Notice Period</th>
                                            <th>Location</th>
                                            <th>Applications</th>
                                            <th>Resume</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidates.map((c) => (
                                            <tr key={c.id}>
                                                <td>
                                                    <div className="user-cell">
                                                        <div className="avatar-sm purple">
                                                            {initials(c.name)}
                                                        </div>
                                                        <div className="user-cell-info">
                                                            <Link
                                                                href={`/admin/users/${c.id}`}
                                                                className="name-link"
                                                                style={{
                                                                    fontWeight: 700,
                                                                    fontSize: 13,
                                                                }}
                                                            >
                                                                {c.name}
                                                            </Link>
                                                            <div className="row-sub">{c.email}</div>
                                                            {c.phoneNumber && (
                                                                <div className="row-sub">{c.phoneNumber}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {c.skills.length > 0 ? (
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: 3,
                                                                flexWrap: "wrap",
                                                                maxWidth: 200,
                                                            }}
                                                        >
                                                            {c.skills.slice(0, 4).map((s) => (
                                                                <span key={s} className="skill-badge">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                            {c.skills.length > 4 && (
                                                                <span className="skill-badge muted-badge">
                                                                    +{c.skills.length - 4}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="muted">—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {c.currentCTC ? (
                                                        <span>
                                                            {c.currentCurrency && <span className="muted" style={{ fontSize: 11 }}>{c.currentCurrency} </span>}
                                                            {c.currentCTC}
                                                        </span>
                                                    ) : (
                                                        <span className="muted">—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {c.expectedCTC ? (
                                                        <span>
                                                            {c.expectedCurrency && <span className="muted" style={{ fontSize: 11 }}>{c.expectedCurrency} </span>}
                                                            {c.expectedCTC}
                                                        </span>
                                                    ) : (
                                                        <span className="muted">—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {c.noticePeriod || <span className="muted">—</span>}
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const loc = [c.city, c.state, c.country].filter(Boolean).join(", ") || c.jobLocation;
                                                        return loc ? (
                                                            <span title={loc} style={{ display: "block", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                {loc}
                                                            </span>
                                                        ) : (
                                                            <span className="muted">—</span>
                                                        );
                                                    })()}
                                                </td>
                                                <td>
                                                    {c.applicationCount > 0 ? (
                                                        <span className="badge role-candidate no-dot">
                                                            {c.applicationCount}
                                                        </span>
                                                    ) : (
                                                        <span className="muted">0</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                        {c.resumeUrl ? (
                                                            <a
                                                                href={`/api/resume/view?url=${encodeURIComponent(c.resumeUrl)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="name-link"
                                                                style={{ fontWeight: 600 }}
                                                            >
                                                                CV
                                                            </a>
                                                        ) : (
                                                            <span className="muted">—</span>
                                                        )}
                                                        {c.linkedin && (
                                                            <a
                                                                href={c.linkedin.startsWith("http") ? c.linkedin : `https://${c.linkedin}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="name-link"
                                                                style={{ fontWeight: 600, fontSize: 11 }}
                                                                title="LinkedIn"
                                                            >
                                                                in
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="pagination">
                                <div className="pagination-left">
                                    <span className="pagination-info">Rows per page</span>
                                    <select
                                        className="pagination-select"
                                        value={pageSize}
                                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                    >
                                        {PAGE_SIZE_OPTIONS.map((size) => (
                                            <option key={size} value={size}>
                                                {size}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <span className="pagination-info">
                                    {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                                </span>

                                <div className="pagination-right">
                                    <button
                                        className="btn pagination-btn"
                                        disabled={page <= 1}
                                        onClick={() => handlePageChange(1)}
                                        title="First page"
                                    >
                                        <ChevronLeft size={14} />
                                        <ChevronLeft size={14} style={{ marginLeft: -8 }} />
                                    </button>
                                    <button
                                        className="btn pagination-btn"
                                        disabled={page <= 1}
                                        onClick={() => handlePageChange(page - 1)}
                                        title="Previous page"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span className="pagination-info">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        className="btn pagination-btn"
                                        disabled={page >= totalPages}
                                        onClick={() => handlePageChange(page + 1)}
                                        title="Next page"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                    <button
                                        className="btn pagination-btn"
                                        disabled={page >= totalPages}
                                        onClick={() => handlePageChange(totalPages)}
                                        title="Last page"
                                    >
                                        <ChevronRight size={14} />
                                        <ChevronRight size={14} style={{ marginLeft: -8 }} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
