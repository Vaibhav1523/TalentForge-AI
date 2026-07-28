"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Briefcase,
  MapPin,
  DollarSign,
  CheckCircle,
  SlidersHorizontal,
  X,
  Loader2,
  Clock,
} from "lucide-react";
import Link from "next/link";

type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  employmentType: string;
  location: string;
  salary: string;
  currency: string;
  skills: string[];
  experienceMin?: number | null;
  experienceMax?: number | null;
  createdAt: string;
  companySlug?: string | null;
};

type Application = {
  id: string;
  jobId: string;
  status: string;
};

const JOBS_PAGE_SIZE = 12;

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [jobsLoading, setJobsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [appsLoading, setAppsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [debouncedSkills, setDebouncedSkills] = useState("");
  const retryControllerRef = useRef<AbortController | null>(null);
  /** Bumps on each full list reset so stale "load more" responses are ignored. */
  const jobsListEpochRef = useRef(0);
  const [filters, setFilters] = useState({
    fullTime: false,
    contract: false,
    internship: false,
    category: "All Categories",
    skills: "",
  });

  const fetchApplications = useCallback(async (signal?: AbortSignal) => {
    setAppsLoading(true);
    try {
      const res = await fetch("/api/applications", { signal });
      if (!res.ok) {
        setAppliedJobIds(new Set());
        return;
      }
      const appsData: Application[] = await res.json();
      setAppliedJobIds(
        new Set(
          appsData
            .filter((app) => (app.status ?? "").toUpperCase() !== "WITHDRAWN")
            .map((app) => app.jobId),
        ),
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      if (!signal?.aborted) {
        setAppsLoading(false);
      }
    }
  }, []);

  const loadMoreLockRef = useRef(false);

  const fetchJobsPage = useCallback(
    async (pageNum: number, append: boolean, signal?: AbortSignal) => {
      const isFirstPage = pageNum === 1 && !append;
      let requestEpoch: number;
      if (isFirstPage) {
        jobsListEpochRef.current += 1;
        requestEpoch = jobsListEpochRef.current;
      } else {
        requestEpoch = jobsListEpochRef.current;
      }
      const isStale = () => requestEpoch !== jobsListEpochRef.current;

      if (isFirstPage) {
        setJobsLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError("");
      try {
        const types: string[] = [];
        if (filters.fullTime) types.push("Full-time");
        if (filters.contract) types.push("Contract");
        if (filters.internship) types.push("Internship");

        const params = new URLSearchParams();
        if (types.length > 0) params.set("employmentType", types.join(","));
        if (filters.category !== "All Categories")
          params.set("category", filters.category);
        if (debouncedSkills.trim())
          params.set("skills", debouncedSkills.trim());
        params.set("page", String(pageNum));
        params.set("pageSize", String(JOBS_PAGE_SIZE));

        const jobsUrl = `/api/jobs?${params.toString()}`;
        const jobsRes = await fetch(jobsUrl, { signal });

        if (!jobsRes.ok) {
          const errorData = await jobsRes.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error || "Failed to fetch jobs",
          );
        }

        const body = (await jobsRes.json()) as {
          jobs?: Job[];
          pagination?: { hasMore?: boolean };
        };
        const list = Array.isArray(body.jobs) ? body.jobs : [];

        if (isStale()) return;

        if (append) {
          setJobs((prev) => [...prev, ...list]);
        } else {
          setJobs(list);
        }
        if (isStale()) return;
        setHasMore(Boolean(body.pagination?.hasMore));
        setPage(pageNum);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (isStale()) return;
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load jobs. Please try again later.";
        setError(message);
      } finally {
        if (!signal?.aborted) {
          if (isFirstPage) setJobsLoading(false);
          else setLoadingMore(false);
        }
      }
    },
    [
      filters.fullTime,
      filters.contract,
      filters.internship,
      filters.category,
      debouncedSkills,
    ],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSkills(filters.skills);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters.skills]);

  useEffect(() => {
    const controller = new AbortController();
    fetchApplications(controller.signal);
    return () => controller.abort();
  }, [fetchApplications]);

  useEffect(() => {
    const controller = new AbortController();
    fetchJobsPage(1, false, controller.signal);
    return () => controller.abort();
  }, [fetchJobsPage]);

  useEffect(() => {
    return () => {
      retryControllerRef.current?.abort();
    };
  }, []);

  const fetchData = useCallback(async () => {
    retryControllerRef.current?.abort();
    const controller = new AbortController();
    retryControllerRef.current = controller;
    try {
      await Promise.all([
        fetchApplications(controller.signal),
        fetchJobsPage(1, false, controller.signal),
      ]);
    } finally {
      if (retryControllerRef.current === controller) {
        retryControllerRef.current = null;
      }
    }
  }, [fetchApplications, fetchJobsPage]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadNextPage = useCallback(() => {
    if (
      !hasMore ||
      loadingMore ||
      jobsLoading ||
      loadMoreLockRef.current
    ) {
      return;
    }
    loadMoreLockRef.current = true;
    const controller = new AbortController();
    void fetchJobsPage(page + 1, true, controller.signal).finally(() => {
      loadMoreLockRef.current = false;
    });
  }, [fetchJobsPage, hasMore, loadingMore, jobsLoading, page]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore || jobsLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadNextPage();
      },
      { root: null, rootMargin: "240px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, jobsLoading, loadNextPage, jobs.length]);

  const handleClearFilters = () => {
    setFilters({
      fullTime: false,
      contract: false,
      internship: false,
      category: "All Categories",
      skills: "",
    });
  };

  // Filtering is applied server-side via API query params (fetchJobs builds
  // the URL with employmentType / category / skills params based on filter state).
  // No client-side alias needed; `jobs` is already the filtered result.
  const hasActiveFilters =
    filters.fullTime ||
    filters.contract ||
    filters.internship ||
    filters.category !== "All Categories" ||
    Boolean(filters.skills.trim());
  const loading = jobsLoading || appsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center">
        <div
          style={{
            backgroundColor: "#fee2e2",
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <X size={32} style={{ color: "#ef4444" }} />
        </div>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          Something went wrong
        </h2>
        <p
          style={{ color: "#6b7280", maxWidth: "400px", margin: "0 auto 24px" }}
        >
          {error}
        </p>
        <button
          type="button"
          onClick={() => fetchData()}
          className="btn-primary"
          style={{ padding: "10px 32px" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Inline JSX variable instead of a component-inside-render to avoid
  // React reconciliation issues (new identity each render breaks input focus).
  const filterContent = (
    <>
      <div className="filter-group">
        <h3 className="filter-title">Employment Type</h3>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={filters.fullTime}
              onChange={(e) =>
                setFilters({ ...filters, fullTime: e.target.checked })
              }
            />
            Full Time
          </label>
          <label>
            <input
              type="checkbox"
              checked={filters.contract}
              onChange={(e) =>
                setFilters({ ...filters, contract: e.target.checked })
              }
            />
            Freelance / Contract
          </label>
          <label>
            <input
              type="checkbox"
              checked={filters.internship}
              onChange={(e) =>
                setFilters({ ...filters, internship: e.target.checked })
              }
            />
            Internship
          </label>
        </div>
      </div>

      <div className="filter-group">
        <h3 className="filter-title">Category</h3>
        <select
          className="form-input"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option>All Categories</option>
          <option>Engineering</option>
          <option>Design</option>
          <option>Marketing</option>
          <option>Product</option>
        </select>
      </div>

      <div className="filter-group">
        <h3 className="filter-title">Skills</h3>
        <input
          type="text"
          placeholder="e.g. React, Python"
          className="form-input"
          value={filters.skills}
          onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
        />
      </div>

      <div className="filter-actions">
        <button
          type="button"
          className="btn-secondary"
          style={{ width: "100%" }}
          onClick={handleClearFilters}
        >
          Clear Filters
        </button>
      </div>
    </>
  );

  return (
    <div>
      <div
        className="page-header page-header-content"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "32px",
          width: "100%",
        }}
      >
        <div>
          <h1 className="page-title">Find Your Next Role</h1>
          <p className="page-subtitle">
            Browse open positions tailored for you.
          </p>
        </div>
        {/* Filter Button - shown on mobile/tablet, hidden on desktop via CSS */}
        <button
          type="button"
          className="filter-toggle-btn"
          onClick={() => setIsFilterOpen(true)}
          aria-label="Open filters"
          style={{ flexShrink: 0 }}
        >
          <SlidersHorizontal size={20} />
          <span>Filters</span>
        </button>
      </div>

      <div className="jobs-page-grid">
        {/* Job List - Now on LEFT */}
        <div className="job-list">
          {jobs.length === 0 ? (
            <div className="jobs-empty-state">
              <div className="jobs-empty-inner">
                <div className="jobs-empty-icon">
                  <Briefcase size={34} />
                </div>
                <h2 className="jobs-empty-title">
                  {hasActiveFilters
                    ? "No jobs match these filters"
                    : "No jobs available yet"}
                </h2>
                <p className="jobs-empty-text">
                  {hasActiveFilters
                    ? "Try broadening filters to view more opportunities."
                    : "We're currently matching new opportunities. Check back soon for new openings."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="btn-secondary jobs-empty-action"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              className="jobs-list-stack"
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {jobs.map((job) => {
                const hasApplied = appliedJobIds.has(job.id);

                return (
                  <div
                    key={job.id}
                    className="job-card candidate-job-card candidate-job-card-layout"
                  >
                    {/* Left Content Area */}
                    <div
                      className="job-info candidate-job-info"
                      style={{
                        flex: "1",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        minWidth: "0",
                      }}
                    >
                      <div
                        className="candidate-job-header-row"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          className="candidate-job-title-wrap"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            minWidth: 0,
                          }}
                        >
                          <h3
                            className="candidate-job-title"
                            style={{
                              margin: 0,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: "1.4",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                            }}
                          >
                            {job.title}
                          </h3>
                        </div>
                        <div
                          className="candidate-job-company-badge"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <Briefcase size={14} />
                          <span
                            className="company-name candidate-job-company"
                            style={{ margin: 0 }}
                          >
                            {job.company}
                          </span>
                        </div>
                      </div>

                      {/* Tags Row */}
                      <div className="job-tags candidate-job-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <span
                          className="tag"
                          style={{ border: "1px solid #dbeafe" }}
                        >
                          {job.employmentType}
                        </span>
                        {job.skills &&
                          job.skills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="tag"
                              style={{
                                backgroundColor: "#f8fafc",
                                color: "#475569",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                      </div>

                      {/* Meta Data Row */}
                      <div
                        className="job-meta-row candidate-job-meta-row"
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "12px 20px",
                          alignItems: "center",
                          marginTop: "4px",
                          width: "100%",
                        }}
                      >
                        <div
                          className="job-meta-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#64748b",
                            fontSize: "14px",
                            minWidth: "0",
                          }}
                        >
                          <MapPin size={16} />
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "180px",
                            }}
                          >
                            {job.location}
                          </span>
                        </div>
                        <div
                          className="job-meta-item job-meta-salary"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#64748b",
                            fontSize: "14px",
                            minWidth: "0",
                          }}
                        >
                          {job.currency === "USD" ? (
                            <DollarSign size={16} />
                          ) : (
                            <Briefcase size={16} />
                          )}
                          <span
                            className="job-salary-value"
                            style={{
                              fontWeight: "600",
                              color: "#334155",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {job.salary || "Competitive"}{" "}
                            {job.currency && job.currency !== "USD"
                              ? job.currency
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Area */}
                    <div
                      className="job-actions candidate-job-actions candidate-job-actions-bottom"
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginTop: "2px",
                      }}
                    >
                      {job.experienceMin !== null &&
                        job.experienceMin !== undefined ? (
                        <div
                          className="job-exp-pill candidate-job-exp-pill"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: "#fffbeb",
                            color: "#92400e",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "700",
                            border: "1px solid #fef3c7",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Clock size={16} />
                          <span>
                            Experience: {job.experienceMin}
                            {job.experienceMax
                              ? `-${job.experienceMax}`
                              : "+"}{" "}
                            years
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}

                      <div
                        className="candidate-job-action-slot"
                        style={{
                          marginLeft: "auto",
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        {hasApplied ? (
                          <div
                            className="candidate-job-applied-stack"
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              width: "170px",
                              alignItems: "stretch",
                            }}
                          >
                            <button
                              type="button"
                              className="btn-secondary job-applied-btn"
                              disabled
                              style={{
                                width: "100%",
                                height: "44px",
                                borderRadius: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                fontSize: "15px",
                                fontWeight: "600",
                                cursor: "not-allowed",
                              }}
                            >
                              <CheckCircle size={18} />
                              <span>Applied</span>
                            </button>
                            <Link
                              href="/dashboard/applications"
                              className="job-actions-view-link"
                              style={{
                                fontSize: "13px",
                                textDecoration: "none",
                                fontWeight: "600",
                                textAlign: "center",
                              }}
                            >
                              View Application
                            </Link>
                          </div>
                        ) : (
                          <Link
                            href={job.companySlug
                              ? `/dashboard/${job.companySlug}/jobs/${job.id}/apply`
                              : `/dashboard/jobs/${job.id}/apply`}
                            className="btn-primary job-apply-btn"
                            style={{
                              textDecoration: "none",
                              width: "170px",
                              height: "44px",
                              borderRadius: "12px",
                              fontSize: "15px",
                              fontWeight: "600",
                            }}
                          >
                            Apply Now
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div
                  ref={loadMoreRef}
                  className="jobs-infinite-sentinel"
                  aria-hidden
                  style={{ height: "1px", width: "100%" }}
                />
              )}
              {loadingMore && (
                <div
                  className="flex items-center justify-center py-8"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2
                    className="animate-spin text-blue-500"
                    size={28}
                    aria-label="Loading more jobs"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Filter Panel - Now on RIGHT */}
        <div className="filter-card card desktop-filter">
          <h3 className="filter-header">Filters</h3>
          {filterContent}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isFilterOpen && (
        <>
          <div
            className="filter-drawer-overlay"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="filter-drawer">
            <div className="filter-drawer-header">
              <h3>Filters</h3>
              <button
                type="button"
                className="filter-drawer-close"
                onClick={() => setIsFilterOpen(false)}
                aria-label="Close filters"
              >
                <X size={24} />
              </button>
            </div>
            <div className="filter-drawer-content">
              {filterContent}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
