'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Briefcase, Clock, ArrowRight, Search, SlidersHorizontal, X, Building2 } from 'lucide-react';

export type PublicJob = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: string | null;
  category: string | null;
  skills: string[];
  salary: string | null;
  currency: string | null;
  workMode?: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  createdAt: string;
  companySlug: string | null;
};

interface JobsClientProps {
  jobs: PublicJob[];
  fromCompany: string | null;
}

function timeAgo(date: string | null | undefined): string {
  if (!date) return 'Invalid date';
  const timestamp = new Date(date).getTime();
  if (isNaN(timestamp)) return 'Invalid date';
  const diff = Date.now() - timestamp;
  if (diff < 0) return 'In the future';
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function normalizeEmpType(s: string): string {
  return s.toLowerCase().replace(/[-_\s]+/g, '');
}

const WORK_TYPES = ['Remote', 'Onsite', 'Hybrid'];
const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const CATEGORIES = ['Engineering', 'Marketing', 'Sales', 'Design', 'Finance', 'Human Resources', 'Operations', 'Product', 'Other'];
const DATE_OPTIONS = [
  { label: 'Any time', days: 0 },
  { label: 'Past 24 hours', days: 1 },
  { label: 'Past week', days: 7 },
  { label: 'Past month', days: 30 },
];
const SALARY_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: '< 5 LPA', min: 0, max: 500000 },
  { label: '5–10 LPA', min: 500000, max: 1000000 },
  { label: '10–20 LPA', min: 1000000, max: 2000000 },
  { label: '20–40 LPA', min: 2000000, max: 4000000 },
  { label: '40 LPA+', min: 4000000, max: Infinity },
];

function chip(label: string, active: boolean, onClick: () => void) {
  return (
    <button
      key={label}
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
        border: `1px solid ${active ? '#0d9488' : 'rgba(255,255,255,0.12)'}`,
        background: active ? 'rgba(13,148,136,0.2)' : 'rgba(255,255,255,0.04)',
        color: active ? '#2dd4bf' : 'rgba(255,255,255,0.55)',
        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function JobCard({ job }: { job: PublicJob }) {
  const href = job.companySlug ? `/jobs/${job.companySlug}/${job.id}` : `/jobs/${job.id}`;
  const exp = job.experienceMin != null
    ? `${job.experienceMin}–${job.experienceMax ?? job.experienceMin} yrs`
    : null;
  const initial = (job.company || '?')[0].toUpperCase();
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <article
        className="job-card"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px',
          padding: 'clamp(22px, 3vw, 30px)',
          transition: 'border-color 0.25s, background 0.25s, box-shadow 0.25s, transform 0.25s',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = 'rgba(13,148,136,0.35)';
          el.style.background = 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, rgba(56,100,220,0.03) 100%)';
          el.style.boxShadow = '0 8px 40px rgba(13,148,136,0.08), 0 0 0 1px rgba(13,148,136,0.1)';
          el.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = 'rgba(255,255,255,0.07)';
          el.style.background = 'rgba(255,255,255,0.03)';
          el.style.boxShadow = 'none';
          el.style.transform = 'none';
        }}
      >
        {/* Row 1: Company badge + Title + Salary */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(13,148,136,0.25), rgba(13,148,136,0.08))',
            border: '1px solid rgba(13,148,136,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: 800, color: '#2dd4bf', letterSpacing: '-0.5px',
          }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: 'clamp(16px, 2vw, 18px)', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                  {job.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#2dd4bf', fontWeight: 600, margin: '2px 0 0' }}>
                  {job.company}
                </p>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                {job.salary && (
                  <span style={{
                    color: '#2dd4bf', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                  }}>
                    {job.currency ?? 'USD'} {job.salary}
                  </span>
                )}
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                  {timeAgo(job.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Meta pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: job.skills.length > 0 ? '12px' : '0' }}>
          {job.location && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px', padding: '4px 11px',
            }}>
              <MapPin size={11} strokeWidth={2} /> {job.location}
            </span>
          )}
          {job.employmentType && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px', padding: '4px 11px',
            }}>
              <Briefcase size={11} strokeWidth={2} /> {job.employmentType.replace(/_/g, ' ')}
            </span>
          )}
          {job.workMode && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: job.workMode === 'Remote' ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.08)',
              color: job.workMode === 'Remote' ? '#4ade80' : '#a5b4fc',
              border: `1px solid ${job.workMode === 'Remote' ? 'rgba(34,197,94,0.18)' : 'rgba(99,102,241,0.18)'}`,
              borderRadius: '20px', padding: '4px 11px', fontSize: '12px', fontWeight: 600,
            }}>
              {job.workMode}
            </span>
          )}
          {exp && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px', padding: '4px 11px',
            }}>
              <Clock size={11} strokeWidth={2} /> {exp}
            </span>
          )}
        </div>

        {/* Row 3: Skills */}
        {job.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {job.skills.slice(0, 5).map((skill, i) => (
              <span key={`${skill}-${i}`} style={{
                background: 'rgba(13,148,136,0.08)', color: '#2dd4bf',
                border: '1px solid rgba(13,148,136,0.18)',
                borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600,
              }}>
                {skill}
              </span>
            ))}
            {job.skills.length > 5 && (
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', alignSelf: 'center', paddingLeft: '2px' }}>
                +{job.skills.length - 5}
              </span>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}

function parseSalaryNum(salary: string | null): number | null {
  if (!salary) return null;
  const raw = salary.split(' - ')[0].replace(/[^0-9]/g, '');
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

export default function JobsClient({ jobs, fromCompany }: JobsClientProps) {
  const [companyFilter, setCompanyFilter] = useState(fromCompany);
  const clearCompanyFilter = () => {
    setCompanyFilter(null);
    window.history.replaceState(null, '', '/jobs');
  };
  const [search, setSearch] = useState('');
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [empTypes, setEmpTypes] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [dateIdx, setDateIdx] = useState(0);
  const [salaryIdx, setSalaryIdx] = useState(0);
  const [locationSearch, setLocationSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const companyJobs = useMemo(
    () => companyFilter ? jobs.filter(j => j.companySlug === companyFilter) : [],
    [jobs, companyFilter]
  );
  const companyName = companyJobs[0]?.company ?? companyFilter ?? '';

  const activeFiltersCount = [
    workTypes.length > 0, empTypes.length > 0, !!category,
    dateIdx > 0, salaryIdx > 0, !!locationSearch.trim(),
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const dateCutoff = dateIdx > 0 ? Date.now() - DATE_OPTIONS[dateIdx].days * 86400000 : 0;
    const { min: salMin, max: salMax } = SALARY_RANGES[salaryIdx];
    const loc = locationSearch.toLowerCase();

    return jobs.filter(job => {
      if (q && !job.title.toLowerCase().includes(q) &&
          !job.company.toLowerCase().includes(q) &&
          !job.skills.some(s => s.toLowerCase().includes(q))) return false;
      if (workTypes.length && !workTypes.includes(job.workMode ?? '')) return false;
      if (empTypes.length && !empTypes.some(t => normalizeEmpType(t) === normalizeEmpType(job.employmentType ?? ''))) return false;
      if (category && job.category !== category) return false;
      if (dateIdx > 0 && new Date(job.createdAt).getTime() < dateCutoff) return false;
      if (salaryIdx > 0) {
        const s = parseSalaryNum(job.salary);
        if (s === null || s < salMin || s > salMax) return false;
      }
      if (loc && !(job.location ?? '').toLowerCase().includes(loc)) return false;
      return true;
    });
  }, [jobs, search, workTypes, empTypes, category, dateIdx, salaryIdx, locationSearch]);

  const otherJobs = useMemo(
    () => companyFilter ? filtered.filter(j => j.companySlug !== companyFilter) : filtered,
    [filtered, companyFilter]
  );
  const companyFiltered = useMemo(
    () => companyFilter ? filtered.filter(j => j.companySlug === companyFilter) : [],
    [filtered, companyFilter]
  );

  const clearFilters = () => {
    setWorkTypes([]); setEmpTypes([]); setCategory('');
    setDateIdx(0); setSalaryIdx(0); setLocationSearch('');
  };

  const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) =>
    arr.includes(val) ? set(arr.filter(x => x !== val)) : set([...arr, val]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '110px 20px 0' }}>

        {/* Hero header */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 46px)', fontWeight: 800, color: '#fff',
            margin: '0 0 10px', letterSpacing: '-0.8px', lineHeight: 1.1,
          }}>
            Open Roles
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.35)', margin: 0, fontWeight: 500 }}>
            {jobs.length} active {jobs.length === 1 ? 'position' : 'positions'} · updated live
          </p>
        </div>

        {/* Search + filter toggle bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, minWidth: '240px', display: 'flex', alignItems: 'center', gap: '12px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px', padding: '0 16px',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(13,148,136,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.08)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Search size={16} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search jobs, companies, skills…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search jobs, companies, skills"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: '15px', padding: '14px 0',
              }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}>
                <X size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(o => !o)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '0 18px', borderRadius: '14px',
              border: `1px solid ${filtersOpen || activeFiltersCount > 0 ? 'rgba(13,148,136,0.5)' : 'rgba(255,255,255,0.08)'}`,
              background: filtersOpen || activeFiltersCount > 0 ? 'rgba(13,148,136,0.1)' : 'rgba(255,255,255,0.03)',
              color: activeFiltersCount > 0 ? '#2dd4bf' : 'rgba(255,255,255,0.5)',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', height: '50px', whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            <SlidersHorizontal size={15} />
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                padding: '0 16px', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.2)',
                background: 'rgba(239,68,68,0.06)', color: '#f87171',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', height: '50px',
                transition: 'all 0.2s',
              }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Expandable filter panel */}
        {filtersOpen && (
          <div style={{
            background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '18px', padding: '22px 24px', marginBottom: '20px',
            backdropFilter: 'blur(16px)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>

              {/* Work Type */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>Work Type</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {WORK_TYPES.map(t => chip(t, workTypes.includes(t), () => toggleArr(workTypes, t, setWorkTypes)))}
                </div>
              </div>

              {/* Employment Type */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>Employment</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {EMP_TYPES.map(t => chip(t, empTypes.includes(t), () => toggleArr(empTypes, t, setEmpTypes)))}
                </div>
              </div>

              {/* Date Posted */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>Date Posted</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {DATE_OPTIONS.map((d, i) => chip(d.label, dateIdx === i, () => setDateIdx(i)))}
                </div>
              </div>

              {/* Salary Range */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>Salary Range</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {SALARY_RANGES.map((r, i) => chip(r.label, salaryIdx === i, () => setSalaryIdx(i)))}
                </div>
              </div>

              {/* Category */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>Category</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {chip('All', !category, () => setCategory(''))}
                  {CATEGORIES.map(c => chip(c, category === c, () => setCategory(prev => prev === c ? '' : c)))}
                </div>
              </div>

              {/* Location */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>Location</p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', padding: '0 12px',
                }}>
                  <MapPin size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, India"
                    value={locationSearch}
                    onChange={e => setLocationSearch(e.target.value)}
                    aria-label="Filter by location"
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      color: '#fff', fontSize: '13px', padding: '9px 0',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Active filter chips ──────────────────────────────── */}
        {(() => {
          const chips: { label: string; onClear: () => void }[] = [];
          if (search) chips.push({ label: `"${search}"`, onClear: () => setSearch('') });
          if (companyFilter) chips.push({ label: `Company: ${companyName || companyFilter}`, onClear: clearCompanyFilter });
          workTypes.forEach(t => chips.push({ label: t, onClear: () => setWorkTypes(prev => prev.filter(x => x !== t)) }));
          empTypes.forEach(t => chips.push({ label: t, onClear: () => setEmpTypes(prev => prev.filter(x => x !== t)) }));
          if (category) chips.push({ label: category, onClear: () => setCategory('') });
          if (dateIdx > 0) chips.push({ label: DATE_OPTIONS[dateIdx].label, onClear: () => setDateIdx(0) });
          if (salaryIdx > 0) chips.push({ label: SALARY_RANGES[salaryIdx].label, onClear: () => setSalaryIdx(0) });
          if (locationSearch.trim()) chips.push({ label: `📍 ${locationSearch}`, onClear: () => setLocationSearch('') });

          if (chips.length === 0) return null;
          return (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginRight: '4px' }}>
                Active:
              </span>
              {chips.map((c, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  background: 'rgba(13,148,136,0.1)', color: '#2dd4bf',
                  border: '1px solid rgba(13,148,136,0.25)',
                }}>
                  {c.label}
                  <button type="button" onClick={c.onClear} aria-label={`Clear ${c.label}`} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: 'rgba(45,212,191,0.6)', display: 'flex', lineHeight: 1,
                  }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              {chips.length > 1 && (
                <button type="button" onClick={() => {
                  setSearch(''); clearFilters();
                  clearCompanyFilter();
                }} style={{
                  padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                  background: 'rgba(239,68,68,0.06)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.18)',
                  cursor: 'pointer',
                }}>
                  Clear all
                </button>
              )}
            </div>
          );
        })()}

        {/* ── More from this company ──────────────────────────────── */}
        {companyFilter && companyJobs.length > 0 && (
          <section style={{ marginBottom: '36px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
              padding: '12px 18px', borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(13,148,136,0.02) 100%)',
              border: '1px solid rgba(13,148,136,0.15)',
            }}>
              <Building2 size={16} style={{ color: '#2dd4bf' }} />
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#2dd4bf', margin: 0, flex: 1 }}>
                More from {companyName}
              </h2>
              <span style={{
                background: 'rgba(13,148,136,0.15)', color: '#2dd4bf',
                borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700,
              }}>
                {companyFiltered.length}
              </span>
            </div>
            {companyFiltered.length === 0 ? (
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', padding: '20px 0' }}>
                No matching jobs from {companyName} with current filters.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {companyFiltered.map(job => <JobCard key={job.id} job={job} />)}
              </div>
            )}
            <div style={{
              height: '1px', margin: '32px 0 24px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
            }} />
          </section>
        )}

        {/* ── All jobs ────────────────────────────────────────────── */}
        <section style={{ paddingBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{
              fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: 0,
            }}>
              {companyFilter ? 'All companies' : 'All positions'}
            </h2>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
              {otherJobs.length} result{otherJobs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {otherJobs.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.02)', borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <Briefcase size={40} style={{ marginBottom: '16px', opacity: 0.2 }} />
              <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px', color: 'rgba(255,255,255,0.4)' }}>No jobs match your filters</p>
              <p style={{ fontSize: '13px', margin: 0, color: 'rgba(255,255,255,0.25)' }}>Try adjusting or clearing the filters above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {otherJobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
