"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { CascadeRecruiterRow } from "@/lib/admin/admin-filter-helpers";
import { serializeAdminIdList } from "@/lib/admin/admin-filter-helpers";

export type CascadeJobOption = { id: string; title: string; company: string };

type Props = {
    companyOptions: { key: string; label: string }[];
    initialCompanyKeys: string[];
    initialRecruiterIds: string[];
    initialJobIds: string[];
    initialRecruiters: CascadeRecruiterRow[];
    initialJobs: CascadeJobOption[];
    orphanJobs?: CascadeJobOption[];
    showJobSelect?: boolean;
    loadJobs?: boolean;
    companyLabel: string;
    recruiterLabel: string;
    jobLabel?: string;
    jobPlaceholderWhenRecruiterSelected?: string;
    /** When set, called after scope (company / recruiter / job ids) changes — e.g. push new URL without form submit. */
    onScopeChange?: (serialized: { companyKey: string; recruiterId: string; jobId: string }) => void;
};

const ENDPOINT = "/api/admin/scope-filter-options";

function norm(s: string) {
    return s.trim().toLowerCase();
}

function recruiterDisplay(r: CascadeRecruiterRow) {
    return r.companyName && r.companyName !== r.name ? `${r.name} · ${r.companyName}` : r.name;
}

function jobDisplay(j: CascadeJobOption) {
    return `${j.title} — ${j.company}`;
}

export function AdminScopeCascadeFields({
    companyOptions,
    initialCompanyKeys,
    initialRecruiterIds,
    initialJobIds,
    initialRecruiters,
    initialJobs,
    orphanJobs = [],
    showJobSelect = true,
    loadJobs = true,
    companyLabel,
    recruiterLabel,
    jobLabel = "3. Jobs (optional)",
    jobPlaceholderWhenRecruiterSelected = "All jobs for selected recruiter(s)",
    onScopeChange,
}: Props) {
    const [companyKeys, setCompanyKeys] = useState<string[]>(initialCompanyKeys);
    const [recruiterIds, setRecruiterIds] = useState<string[]>(initialRecruiterIds);
    const [jobIds, setJobIds] = useState<string[]>(initialJobIds);
    const [recruiters, setRecruiters] = useState(initialRecruiters);
    const [jobs, setJobs] = useState(initialJobs);
    const [loading, setLoading] = useState(false);

    const [companyQuery, setCompanyQuery] = useState("");
    const [recruiterQuery, setRecruiterQuery] = useState("");
    const [jobQuery, setJobQuery] = useState("");
    const [showCompanySuggest, setShowCompanySuggest] = useState(false);
    const [showRecruiterSuggest, setShowRecruiterSuggest] = useState(false);
    const [showJobSuggest, setShowJobSuggest] = useState(false);

    const companyPickerRef = useRef<HTMLDivElement>(null);
    const recruiterPickerRef = useRef<HTMLDivElement>(null);
    const jobPickerRef = useRef<HTMLDivElement>(null);

    const orphanJobIdSet = useMemo(() => new Set(orphanJobs.map((o) => o.id)), [orphanJobs]);

    const fetchScope = useCallback(
        async (ckeys: string[], rids: string[]) => {
            setLoading(true);
            try {
                const sp = new URLSearchParams();
                const cj = serializeAdminIdList(ckeys);
                if (cj) sp.set("companyKey", cj);
                const joined = serializeAdminIdList(rids);
                if (joined) sp.set("recruiterId", joined);
                if (!loadJobs) sp.set("includeJobs", "0");
                const res = await fetch(`${ENDPOINT}?${sp.toString()}`);
                if (!res.ok) return;
                const data = (await res.json()) as {
                    recruiters: CascadeRecruiterRow[];
                    jobs: CascadeJobOption[];
                };
                setRecruiters(data.recruiters);
                setRecruiterIds((prev) => prev.filter((id) => data.recruiters.some((r) => r.id === id)));
                if (loadJobs) {
                    setJobs(data.jobs);
                    setJobIds((prev) =>
                        prev.filter(
                            (id) => data.jobs.some((j) => j.id === id) || orphanJobIdSet.has(id),
                        ),
                    );
                }
            } finally {
                setLoading(false);
            }
        },
        [loadJobs, orphanJobIdSet],
    );

    const onScopeChangeRef = useRef(onScopeChange);
    onScopeChangeRef.current = onScopeChange;

    const skipFirstScopeNotify = useRef(true);
    useEffect(() => {
        if (!onScopeChangeRef.current) {
            return;
        }
        if (skipFirstScopeNotify.current) {
            skipFirstScopeNotify.current = false;
            return;
        }
        const id = window.setTimeout(() => {
            onScopeChangeRef.current?.({
                companyKey: serializeAdminIdList(companyKeys),
                recruiterId: serializeAdminIdList(recruiterIds),
                jobId: serializeAdminIdList(jobIds),
            });
        }, 100);
        return () => window.clearTimeout(id);
    }, [companyKeys, recruiterIds, jobIds]);

    useEffect(() => {
        function handleDown(e: MouseEvent) {
            const t = e.target as Node;
            if (companyPickerRef.current && !companyPickerRef.current.contains(t)) {
                setShowCompanySuggest(false);
            }
            if (recruiterPickerRef.current && !recruiterPickerRef.current.contains(t)) {
                setShowRecruiterSuggest(false);
            }
            if (jobPickerRef.current && !jobPickerRef.current.contains(t)) {
                setShowJobSuggest(false);
            }
        }
        document.addEventListener("mousedown", handleDown);
        return () => document.removeEventListener("mousedown", handleDown);
    }, []);

    async function addCompany(key: string) {
        if (companyKeys.includes(key)) return;
        const next = [...companyKeys, key];
        setCompanyKeys(next);
        setCompanyQuery("");
        setShowCompanySuggest(false);
        await fetchScope(next, recruiterIds);
    }

    async function removeCompany(key: string) {
        const next = companyKeys.filter((k) => k !== key);
        setCompanyKeys(next);
        setCompanyQuery("");
        setShowCompanySuggest(false);
        await fetchScope(next, recruiterIds);
    }

    async function addRecruiter(id: string) {
        if (recruiterIds.includes(id)) return;
        const next = [...recruiterIds, id];
        setRecruiterIds(next);
        setRecruiterQuery("");
        setShowRecruiterSuggest(false);
        await fetchScope(companyKeys, next);
    }

    async function removeRecruiter(id: string) {
        const next = recruiterIds.filter((x) => x !== id);
        setRecruiterIds(next);
        await fetchScope(companyKeys, next);
    }

    function addJob(id: string) {
        if (jobIds.includes(id)) return;
        setJobIds((prev) => [...prev, id]);
        setJobQuery("");
        setShowJobSuggest(false);
    }

    function removeJob(id: string) {
        setJobIds((prev) => prev.filter((x) => x !== id));
    }

    const companiesSelected = companyKeys.length > 0;
    const companyHint =
        "Green tags = companies in scope. Search below to add more; leave empty to include the whole platform.";
    const recruiterHint = companiesSelected
        ? "Cyan tags = selected posters. Search to add from the companies above."
        : "Cyan tags optional — search to add recruiters from anywhere.";

    const jobHint = !showJobSelect
        ? ""
        : recruiterIds.length > 0
          ? jobPlaceholderWhenRecruiterSelected
          : companiesSelected
            ? "Optional — purple tags; search to narrow jobs in scope"
            : "Add companies or recruiters to list jobs";

    const recruiterSubHint = companiesSelected
        ? "Recruiter list is limited to companies in scope."
        : "Whole platform — add companies in column 1 to narrow.";

    const jobSubHint =
        !showJobSelect || !loadJobs
            ? ""
            : recruiterIds.length > 0
              ? "Job list follows selected recruiter(s)."
              : companiesSelected
                ? "Job list follows companies in scope."
                : "Add companies or recruiters to load jobs here.";

    const orphanExtras = orphanJobs.filter((o) => !jobs.some((j) => j.id === o.id));
    const jobOptionsForUi = useMemo(() => [...jobs, ...orphanExtras], [jobs, orphanExtras]);

    const unselectedCompanies = useMemo(() => {
        const sel = new Set(companyKeys);
        const q = norm(companyQuery);
        return companyOptions
            .filter((c) => !sel.has(c.key))
            .filter((c) => {
                if (!q) return true;
                return norm(`${c.label} ${c.key}`).includes(q);
            });
    }, [companyOptions, companyKeys, companyQuery]);

    const selectedCompanyChips = useMemo(() => {
        return companyKeys.map((key) => {
            const opt = companyOptions.find((c) => c.key === key);
            return { key, label: opt?.label ?? key };
        });
    }, [companyKeys, companyOptions]);

    const unselectedRecruiters = useMemo(() => {
        const sel = new Set(recruiterIds);
        const q = norm(recruiterQuery);
        return recruiters
            .filter((r) => !sel.has(r.id))
            .filter((r) => {
                if (!q) return true;
                return norm(`${r.name} ${r.companyName}`).includes(q);
            });
    }, [recruiters, recruiterIds, recruiterQuery]);

    const selectedRecruiterChips = useMemo(() => {
        return recruiterIds.map((id) => {
            const r = recruiters.find((x) => x.id === id);
            return { id, label: r ? recruiterDisplay(r) : `Recruiter …${id.slice(-6)}` };
        });
    }, [recruiterIds, recruiters]);

    const unselectedJobs = useMemo(() => {
        const sel = new Set(jobIds);
        const q = norm(jobQuery);
        return jobOptionsForUi
            .filter((j) => !sel.has(j.id))
            .filter((j) => {
                if (!q) return true;
                return norm(`${j.title} ${j.company}`).includes(q);
            });
    }, [jobOptionsForUi, jobIds, jobQuery]);

    const selectedJobChips = useMemo(() => {
        return jobIds.map((id) => {
            const j = jobOptionsForUi.find((x) => x.id === id);
            const isOrphan = orphanExtras.some((o) => o.id === id);
            return {
                id,
                label: j ? jobDisplay(j) : `Job …${id.slice(-6)}`,
                isOrphan,
            };
        });
    }, [jobIds, jobOptionsForUi, orphanExtras]);

    const canPickRecruiters = recruiters.length > 0;
    const canPickJobs = showJobSelect && loadJobs && jobOptionsForUi.length > 0;

    const trioClass =
        showJobSelect && loadJobs ? "admin-scope-trio admin-scope-trio--3" : "admin-scope-trio admin-scope-trio--2";

    return (
        <>
            <input type="hidden" name="companyKey" value={serializeAdminIdList(companyKeys)} />
            <input type="hidden" name="recruiterId" value={serializeAdminIdList(recruiterIds)} />
            {showJobSelect && loadJobs ? (
                <input type="hidden" name="jobId" value={serializeAdminIdList(jobIds)} />
            ) : null}

            <div className={trioClass}>
                <div className="admin-scope-column" ref={companyPickerRef}>
                    <div className="admin-scope-column-main">
                        <span className="admin-scope-step">{companyLabel}</span>
                        <div className="admin-scope-intro">
                            <p className="admin-scope-hint">{companyHint}</p>
                            <p className="admin-scope-hint admin-scope-hint--sub">
                                {companiesSelected
                                    ? `${companyKeys.length} compan${companyKeys.length === 1 ? "y" : "ies"} in scope`
                                    : "Whole platform — no company filter"}
                            </p>
                        </div>
                        <div className="admin-scope-chip-slot" aria-hidden={selectedCompanyChips.length === 0}>
                            {selectedCompanyChips.length > 0 ? (
                                <div className="admin-scope-chip-row" role="list" aria-label="Selected companies">
                                    {selectedCompanyChips.map(({ key, label }) => (
                                        <span key={key} className="skill-chip skill-chip--scope-company">
                                            {label}
                                            <button
                                                type="button"
                                                className="skill-chip-remove"
                                                disabled={loading}
                                                onClick={() => void removeCompany(key)}
                                                aria-label={`Remove ${label}`}
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <div className="admin-scope-field">
                        <input
                            id="admin-scope-company-search"
                            type="text"
                            className="control-input admin-scope-input"
                            autoComplete="off"
                            placeholder="Search companies to add…"
                            value={companyQuery}
                            disabled={loading}
                            aria-expanded={showCompanySuggest}
                            aria-controls="admin-scope-company-suggestions"
                            onChange={(e) => {
                                setCompanyQuery(e.target.value);
                                setShowCompanySuggest(true);
                            }}
                            onFocus={() => setShowCompanySuggest(true)}
                        />
                        {showCompanySuggest && unselectedCompanies.length > 0 ? (
                            <div className="skill-suggestions" id="admin-scope-company-suggestions" role="listbox">
                                {unselectedCompanies.map((c) => (
                                    <button
                                        key={c.key}
                                        type="button"
                                        className="skill-suggestion-item"
                                        role="option"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => void addCompany(c.key)}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                        {showCompanySuggest && companyQuery.trim() && unselectedCompanies.length === 0 ? (
                            <p className="admin-scope-picker-muted admin-scope-picker-muted--below">
                                No companies match “{companyQuery.trim()}”.
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="admin-scope-column admin-scope-picker" ref={recruiterPickerRef}>
                    <div className="admin-scope-column-main">
                        <span className="admin-scope-step">{recruiterLabel}</span>
                        <div className="admin-scope-intro">
                            <p className="admin-scope-hint">{recruiterHint}</p>
                            <p className="admin-scope-hint admin-scope-hint--sub">{recruiterSubHint}</p>
                        </div>
                        <div className="admin-scope-chip-slot" aria-hidden={selectedRecruiterChips.length === 0}>
                            {selectedRecruiterChips.length > 0 ? (
                                <div className="admin-scope-chip-row" role="list" aria-label="Selected recruiters">
                                    {selectedRecruiterChips.map(({ id, label }) => (
                                        <span key={id} className="skill-chip">
                                            {label}
                                            <button
                                                type="button"
                                                className="skill-chip-remove"
                                                disabled={loading}
                                                onClick={() => void removeRecruiter(id)}
                                                aria-label={`Remove ${label}`}
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <div className="admin-scope-field">
                        {!canPickRecruiters ? (
                            <p className="admin-scope-picker-muted admin-scope-picker-muted--field">
                                {companiesSelected
                                    ? "No recruiters in the selected companies."
                                    : "No recruiters loaded."}
                            </p>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    className="control-input admin-scope-input"
                                    autoComplete="off"
                                    placeholder={
                                        companiesSelected
                                            ? "Search recruiters to add…"
                                            : "Search all recruiters to add…"
                                    }
                                    value={recruiterQuery}
                                    disabled={loading}
                                    aria-expanded={showRecruiterSuggest}
                                    aria-controls="admin-scope-recruiter-suggestions"
                                    onChange={(e) => {
                                        setRecruiterQuery(e.target.value);
                                        setShowRecruiterSuggest(true);
                                    }}
                                    onFocus={() => setShowRecruiterSuggest(true)}
                                />
                                {showRecruiterSuggest && unselectedRecruiters.length > 0 ? (
                                    <div
                                        className="skill-suggestions"
                                        id="admin-scope-recruiter-suggestions"
                                        role="listbox"
                                    >
                                        {unselectedRecruiters.map((r) => (
                                            <button
                                                key={r.id}
                                                type="button"
                                                className="skill-suggestion-item"
                                                role="option"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => void addRecruiter(r.id)}
                                            >
                                                {recruiterDisplay(r)}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                                {showRecruiterSuggest &&
                                recruiterQuery.trim() &&
                                unselectedRecruiters.length === 0 &&
                                canPickRecruiters ? (
                                    <p className="admin-scope-picker-muted admin-scope-picker-muted--below">
                                        No recruiters match “{recruiterQuery.trim()}”.
                                    </p>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>

                {showJobSelect && loadJobs ? (
                    <div className="admin-scope-column admin-scope-picker" ref={jobPickerRef}>
                        <div className="admin-scope-column-main">
                            <span className="admin-scope-step">{jobLabel}</span>
                            <div className="admin-scope-intro">
                                <p className="admin-scope-hint">{jobHint}</p>
                                <p className="admin-scope-hint admin-scope-hint--sub">{jobSubHint}</p>
                            </div>
                            <div className="admin-scope-chip-slot" aria-hidden={selectedJobChips.length === 0}>
                                {selectedJobChips.length > 0 ? (
                                    <div className="admin-scope-chip-row" role="list" aria-label="Selected jobs">
                                        {selectedJobChips.map(({ id, label, isOrphan }) => (
                                            <span
                                                key={id}
                                                className={`skill-chip ${isOrphan ? "skill-chip--scope-orphan" : "skill-chip--scope-job"}`}
                                            >
                                                {label}
                                                {isOrphan ? (
                                                    <span
                                                        className="admin-scope-orphan-tag"
                                                        title="From current URL filter"
                                                    >
                                                        saved
                                                    </span>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    className="skill-chip-remove"
                                                    disabled={loading}
                                                    onClick={() => removeJob(id)}
                                                    aria-label={`Remove ${label}`}
                                                >
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                        <div className="admin-scope-field">
                            {!canPickJobs ? (
                                <p className="admin-scope-picker-muted admin-scope-picker-muted--field">
                                    No jobs in scope — adjust companies or recruiters.
                                </p>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        className="control-input admin-scope-input"
                                        autoComplete="off"
                                        placeholder="Search jobs to add…"
                                        value={jobQuery}
                                        disabled={loading}
                                        aria-expanded={showJobSuggest}
                                        aria-controls="admin-scope-job-suggestions"
                                        onChange={(e) => {
                                            setJobQuery(e.target.value);
                                            setShowJobSuggest(true);
                                        }}
                                        onFocus={() => setShowJobSuggest(true)}
                                    />
                                    {showJobSuggest && unselectedJobs.length > 0 ? (
                                        <div
                                            className="skill-suggestions"
                                            id="admin-scope-job-suggestions"
                                            role="listbox"
                                        >
                                            {unselectedJobs.map((j) => {
                                                const isOrphan = orphanExtras.some((o) => o.id === j.id);
                                                return (
                                                    <button
                                                        key={j.id}
                                                        type="button"
                                                        className="skill-suggestion-item"
                                                        role="option"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => addJob(j.id)}
                                                    >
                                                        {jobDisplay(j)}
                                                        {isOrphan ? " (saved filter)" : ""}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                    {showJobSuggest && jobQuery.trim() && unselectedJobs.length === 0 ? (
                                        <p className="admin-scope-picker-muted admin-scope-picker-muted--below">
                                            No jobs match “{jobQuery.trim()}”.
                                        </p>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    );
}
