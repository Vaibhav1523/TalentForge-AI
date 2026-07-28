'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRecruiterBasePath } from '@/components/RecruiterBasePathContext';
import { useDashboardTheme } from '@/components/dashboard/DashboardThemeProvider';
import { toast } from 'sonner';
import {
    ArrowLeft, ArrowRight, Check, User, Info, FileText,
    CalendarCheck, Search, X, ChevronDown, Calendar, Clock,
    Mail, Bell, Loader2, Video, Building2, Plus
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type CandidateOption = {
    applicationId: string;
    candidateId: string;
    name: string;
    email: string;
    avatar?: string | null;
    jobTitle: string;
    jobId: string;
};

type JobOption = {
    id: string;
    title: string;
};

type Interviewer = {
    id: string;
    name: string;
    avatar?: string | null;
};

type WizardData = {
    // Step 1
    applicationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    // Step 2
    round: string;
    interviewType: 'Online' | 'Onsite';
    interviewers: Interviewer[];
    // Step 3
    date: string;
    time: string;
    internalNotes: string;
    candidateInstructions: string;
    // Step 4
    notifyCandidate: boolean;
    notifyInterviewerEmail: boolean;
    notifyInterviewerSlack: boolean;
    reminder: string;
};

const STEPS = [
    { id: 1, label: 'Candidate', icon: User },
    { id: 2, label: 'Details', icon: Info },
    { id: 3, label: 'Notes', icon: FileText },
    { id: 4, label: 'Schedule', icon: CalendarCheck },
];

const ROUNDS = ['Round 1 - HR', 'Round 2 - Technical', 'Round 3 - System Design', 'Final Round', 'Culture Fit'];
const REMINDERS = ['15 Minutes Before', '30 Minutes Before', '1 Hour Before', '2 Hours Before', '24 Hours Before'];

// Avatar initials fallback
function Initials({ name, size = 32 }: { name: string; size?: number }) {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: size, height: size, borderRadius: '50%', background: color,
            color: '#fff', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
        }}>
            {initials}
        </span>
    );
}

export default function ScheduleInterviewPage() {
    const router = useRouter();
    const base = useRecruiterBasePath();
    const { theme } = useDashboardTheme();
    const isDark = theme === 'dark';

    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [candidates, setCandidates] = useState<CandidateOption[]>([]);
    const [jobs, setJobs] = useState<JobOption[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Candidate search UI
    const [candidateSearch, setCandidateSearch] = useState('');
    const [candidateDropOpen, setCandidateDropOpen] = useState(false);
    const [jobDropOpen, setJobDropOpen] = useState(false);
    const candidateRef = useRef<HTMLDivElement>(null);
    const jobRef = useRef<HTMLDivElement>(null);

    // Interviewer multi-select
    const [interviewerSearch, setInterviewerSearch] = useState('');
    const [interviewerDropOpen, setInterviewerDropOpen] = useState(false);
    const interviewerRef = useRef<HTMLDivElement>(null);

    // All recruiters/interviewers derived from candidates list (or a static pool)
    const [interviewerPool, setInterviewerPool] = useState<Interviewer[]>([]);

    const [data, setData] = useState<WizardData>({
        applicationId: '',
        candidateId: '',
        candidateName: '',
        jobId: '',
        jobTitle: '',
        round: 'Round 1 - HR',
        interviewType: 'Online',
        interviewers: [],
        date: '',
        time: '',
        internalNotes: '',
        candidateInstructions: '',
        notifyCandidate: true,
        notifyInterviewerEmail: true,
        notifyInterviewerSlack: false,
        reminder: '1 Hour Before',
    });

    // ─── Fetch Data ──────────────────────────────────────────────────────────
    useEffect(() => {
        const slug = base.split('/').filter(Boolean).pop() || '';
        const ctrl = new AbortController();

        const load = async () => {
            try {
                const [appsRes, jobsRes] = await Promise.all([
                    fetch(`/api/company/applications?slug=${encodeURIComponent(slug)}&pageSize=100`, { signal: ctrl.signal }),
                    fetch(`/api/company/jobs?slug=${encodeURIComponent(slug)}`, { signal: ctrl.signal }),
                ]);

                if (appsRes.ok) {
                    const raw = await appsRes.json();
                    const apps: {
                        id: string; candidateId: string; status: string;
                        candidate?: { id?: string; name?: string; email?: string; profileImageUrl?: string };
                        job?: { id?: string; title?: string };
                    }[] = Array.isArray(raw) ? raw : (raw?.data ?? []);

                    // Build unique candidates across all applications
                    const seen = new Set<string>();
                    const candidateList: CandidateOption[] = [];
                    apps.forEach(app => {
                        const cid = app.candidateId;
                        if (!seen.has(cid)) {
                            seen.add(cid);
                            candidateList.push({
                                applicationId: app.id,
                                candidateId: cid,
                                name: app.candidate?.name || 'Unknown Candidate',
                                email: app.candidate?.email || '',
                                avatar: app.candidate?.profileImageUrl,
                                jobTitle: app.job?.title || 'Unknown Job',
                                jobId: app.job?.id || '',
                            });
                        }
                    });
                    setCandidates(candidateList);

                    // Build interviewer pool from candidate data (as demo interviewers)
                    // In production you'd fetch from a team/user endpoint
                    setInterviewerPool(candidateList.slice(0, 8).map(c => ({
                        id: c.candidateId,
                        name: c.name,
                        avatar: c.avatar,
                    })));
                }

                if (jobsRes.ok) {
                    const jobData = await jobsRes.json();
                    const jobArr: { id: string; title: string }[] = Array.isArray(jobData) ? jobData : [];
                    setJobs(jobArr.map(j => ({ id: j.id, title: j.title })));
                }
            } catch { /* ignore abort */ }
            finally { setLoadingData(false); }
        };

        load();
        return () => ctrl.abort();
    }, [base]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (candidateRef.current && !candidateRef.current.contains(e.target as Node)) setCandidateDropOpen(false);
            if (jobRef.current && !jobRef.current.contains(e.target as Node)) setJobDropOpen(false);
            if (interviewerRef.current && !interviewerRef.current.contains(e.target as Node)) setInterviewerDropOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ─── Validation ──────────────────────────────────────────────────────────
    const canNext = (): boolean => {
        if (step === 1) return !!data.applicationId && !!data.jobId;
        if (step === 2) return !!data.round && !!data.interviewType;
        if (step === 3) return !!data.date && !!data.time;
        return true;
    };

    // ─── Submit ──────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const isoDate = new Date(`${data.date}T${data.time}`).toISOString();
            const res = await fetch(`/api/company/applications/${data.applicationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'INTERVIEW',
                    interviewScheduledAt: isoDate,
                }),
            });
            if (!res.ok) throw new Error('Failed to schedule');
            toast.success(`Interview scheduled for ${data.candidateName}!`);
            router.push(`${base}/interviews`);
        } catch {
            toast.error('Failed to schedule interview. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Filtered lists ──────────────────────────────────────────────────────
    const filteredCandidates = candidates.filter(c =>
        c.name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(candidateSearch.toLowerCase())
    );
    const filteredInterviewers = interviewerPool.filter(i =>
        !data.interviewers.find(s => s.id === i.id) &&
        i.name.toLowerCase().includes(interviewerSearch.toLowerCase())
    );

    // ─── CSS vars ────────────────────────────────────────────────────────────
    const css = {
        bg: isDark ? 'rgba(6,19,29,0.0)' : '#f8fafc',
        cardBg: isDark ? 'rgba(9,30,43,0.82)' : '#ffffff',
        cardBorder: isDark ? 'rgba(101,177,208,0.28)' : '#e2e8f0',
        text: isDark ? '#e8f7fd' : '#0f172a',
        subText: isDark ? '#8fb4c4' : '#475569',
        inputBg: isDark ? 'rgba(5,18,28,0.7)' : '#ffffff',
        inputBorder: isDark ? 'rgba(101,177,208,0.35)' : '#94a3b8',
        inputText: isDark ? '#cde9f3' : '#0f172a',
        accent: isDark ? '#3ecef7' : '#2563eb',
        accentDim: isDark ? 'rgba(62,206,247,0.15)' : 'rgba(37,99,235,0.1)',
        stepBg: isDark ? 'rgba(7,24,35,0.9)' : '#f1f5f9',
        activeBg: isDark ? 'rgba(62,206,247,0.18)' : 'rgba(37,99,235,0.1)',
        activeBorder: isDark ? '#3ecef7' : '#2563eb',
        doneBg: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.1)',
        labelColor: isDark ? '#9dc3d3' : '#334155',
        dropBg: isDark ? 'rgba(6,20,32,0.98)' : '#ffffff',
        dropBorder: isDark ? 'rgba(62,206,247,0.3)' : '#94a3b8',
        dropHover: isDark ? 'rgba(62,206,247,0.12)' : '#f1f5f9',
        tagBg: isDark ? 'rgba(62,206,247,0.18)' : 'rgba(37,99,235,0.12)',
        tagText: isDark ? '#3ecef7' : '#1d4ed8',
        shadowCard: isDark ? '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(232,250,255,0.1)' : '0 4px 24px rgba(0,0,0,0.06)',
        summaryBg: isDark ? 'rgba(5,18,28,0.7)' : '#f8fafc',
        checkboxLabelColor: isDark ? '#cde9f3' : '#1e293b',
    };

    // ─── Render Step Content ─────────────────────────────────────────────────
    // IMPORTANT: Call as plain functions (not JSX elements) so React does NOT
    // treat them as new component types on each render. Using <Step3 /> would
    // cause unmount+remount on every keystroke (losing textarea focus).
    const renderStep = () => {
        switch (step) {
            case 1: return Step1();
            case 2: return Step2();
            case 3: return Step3();
            case 4: return Step4();
        }
    };

    function Step1() {
        return (
            <div className="si-step-body">
                <h2 className="si-step-title" style={{ color: css.text }}>Candidate Info</h2>

                {/* Candidate Selector */}
                <div className="si-field">
                    <label className="si-label" style={{ color: css.labelColor }}>
                        Candidate Selector <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div ref={candidateRef} style={{ position: 'relative' }}>
                        <button
                            type="button"
                            className="si-select-trigger"
                            style={{ background: css.inputBg, border: `1px solid ${data.candidateName ? css.activeBorder : css.inputBorder}`, color: data.candidateName ? css.inputText : css.subText }}
                            onClick={() => { setCandidateDropOpen(v => !v); setJobDropOpen(false); }}
                        >
                            {data.candidateName ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Initials name={data.candidateName} size={24} />
                                    <span style={{ color: css.inputText }}>{data.candidateName}</span>
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Search size={15} style={{ color: css.subText }} />
                                    <span>Select or Search Candidate...</span>
                                </span>
                            )}
                            <ChevronDown size={16} style={{ color: css.subText, marginLeft: 'auto', transition: 'transform 0.2s', transform: candidateDropOpen ? 'rotate(180deg)' : 'none' }} />
                        </button>
                        {candidateDropOpen && (
                            <div className="si-dropdown" style={{ background: css.dropBg, border: `1px solid ${css.dropBorder}` }}>
                                <div style={{ padding: '8px 8px 4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: css.inputBg, border: `1px solid ${css.inputBorder}`, borderRadius: 8, padding: '6px 10px' }}>
                                        <Search size={14} style={{ color: css.subText }} />
                                        <input
                                            autoFocus
                                            value={candidateSearch}
                                            onChange={e => setCandidateSearch(e.target.value)}
                                            placeholder="Search candidates..."
                                            style={{ background: 'transparent', border: 'none', outline: 'none', color: css.inputText, flex: 1, fontSize: 13 }}
                                        />
                                    </div>
                                </div>
                                <div className="si-dropdown-list">
                                    {loadingData ? (
                                        <div className="si-dropdown-empty"><Loader2 size={16} className="animate-spin" /> Loading...</div>
                                    ) : filteredCandidates.length === 0 ? (
                                        <div className="si-dropdown-empty" style={{ color: css.subText }}>No candidates found</div>
                                    ) : filteredCandidates.map(c => (
                                        <button
                                            key={c.applicationId}
                                            type="button"
                                            className="si-dropdown-item"
                                            style={{ color: css.inputText }}
                                            onClick={() => {
                                                setData(d => ({ ...d, applicationId: c.applicationId, candidateId: c.candidateId, candidateName: c.name, jobId: c.jobId, jobTitle: c.jobTitle }));
                                                setCandidateDropOpen(false);
                                                setCandidateSearch('');
                                            }}
                                        >
                                            <Initials name={c.name} size={28} />
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                                                <div style={{ fontSize: 12, color: css.subText }}>{c.email}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Job Position */}
                <div className="si-field">
                    <label className="si-label" style={{ color: css.labelColor }}>
                        Job Position <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div ref={jobRef} style={{ position: 'relative' }}>
                        <button
                            type="button"
                            className="si-select-trigger"
                            style={{ background: css.inputBg, border: `1px solid ${data.jobTitle ? css.activeBorder : css.inputBorder}`, color: data.jobTitle ? css.inputText : css.subText }}
                            onClick={() => { setJobDropOpen(v => !v); setCandidateDropOpen(false); }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Building2 size={15} style={{ color: css.subText }} />
                                <span style={{ color: data.jobTitle ? css.inputText : css.subText }}>{data.jobTitle || 'Select Job Position'}</span>
                            </span>
                            <ChevronDown size={16} style={{ color: css.subText, marginLeft: 'auto', transition: 'transform 0.2s', transform: jobDropOpen ? 'rotate(180deg)' : 'none' }} />
                        </button>
                        {jobDropOpen && (
                            <div className="si-dropdown" style={{ background: css.dropBg, border: `1px solid ${css.dropBorder}` }}>
                                <div className="si-dropdown-list">
                                    {jobs.length === 0 ? (
                                        <div className="si-dropdown-empty" style={{ color: css.subText }}>No jobs found</div>
                                    ) : jobs.map(j => (
                                        <button
                                            key={j.id}
                                            type="button"
                                            className="si-dropdown-item"
                                            style={{ color: css.inputText }}
                                            onClick={() => {
                                                setData(d => ({ ...d, jobId: j.id, jobTitle: j.title }));
                                                setJobDropOpen(false);
                                            }}
                                        >
                                            <Building2 size={16} style={{ color: css.subText }} />
                                            <span style={{ fontWeight: 500 }}>{j.title}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    function Step2() {
        return (
            <div className="si-step-body">
                <h2 className="si-step-title" style={{ color: css.text }}>Interview Details</h2>

                {/* Round */}
                <div className="si-field">
                    <label className="si-label" style={{ color: css.labelColor }}>Interview Round</label>
                    <div style={{ position: 'relative' }}>
                        <select
                            className="si-input"
                            value={data.round}
                            onChange={e => setData(d => ({ ...d, round: e.target.value }))}
                            style={{ background: css.inputBg, border: `1px solid ${css.inputBorder}`, color: css.inputText, appearance: 'none', paddingRight: 36 }}
                        >
                            {ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: css.subText, pointerEvents: 'none' }} />
                    </div>
                </div>

                {/* Interview Type */}
                <div className="si-field">
                    <label className="si-label" style={{ color: css.labelColor }}>Interview Type</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {(['Online', 'Onsite'] as const).map(type => (
                            <button
                                key={type}
                                type="button"
                                className={`si-radio-btn ${data.interviewType === type ? 'active' : ''}`}
                                style={{
                                    background: data.interviewType === type ? css.accentDim : css.inputBg,
                                    border: `2px solid ${data.interviewType === type ? css.activeBorder : css.inputBorder}`,
                                    color: data.interviewType === type ? css.accent : css.inputText,
                                }}
                                onClick={() => setData(d => ({ ...d, interviewType: type }))}
                            >
                                {type === 'Online' ? <Video size={15} /> : <Building2 size={15} />}
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Interviewers */}
                <div className="si-field">
                    <label className="si-label" style={{ color: css.labelColor }}>Interviewer(s)</label>
                    <div ref={interviewerRef} style={{ position: 'relative' }}>
                        {/* Selected tags */}
                        <div
                            className="si-multi-select"
                            style={{ background: css.inputBg, border: `1px solid ${interviewerDropOpen ? css.activeBorder : css.inputBorder}` }}
                            onClick={() => setInterviewerDropOpen(v => !v)}
                        >
                            {data.interviewers.length === 0 && (
                                <span style={{ color: css.subText, fontSize: 13 }}>Select interviewers...</span>
                            )}
                            {data.interviewers.map(iv => (
                                <span key={iv.id} className="si-tag" style={{ background: css.tagBg, color: css.tagText }}>
                                    <Initials name={iv.name} size={18} />
                                    {iv.name}
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); setData(d => ({ ...d, interviewers: d.interviewers.filter(x => x.id !== iv.id) })); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                                <Plus size={14} style={{ color: css.subText }} />
                            </span>
                        </div>
                        {interviewerDropOpen && (
                            <div className="si-dropdown" style={{ background: css.dropBg, border: `1px solid ${css.dropBorder}` }}>
                                <div style={{ padding: '8px 8px 4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: css.inputBg, border: `1px solid ${css.inputBorder}`, borderRadius: 8, padding: '6px 10px' }}>
                                        <Search size={14} style={{ color: css.subText }} />
                                        <input
                                            autoFocus
                                            value={interviewerSearch}
                                            onChange={e => setInterviewerSearch(e.target.value)}
                                            placeholder="Search..."
                                            style={{ background: 'transparent', border: 'none', outline: 'none', color: css.inputText, flex: 1, fontSize: 13 }}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="si-dropdown-list">
                                    {filteredInterviewers.length === 0 ? (
                                        <div className="si-dropdown-empty" style={{ color: css.subText }}>
                                            {interviewerPool.length === 0 ? 'No interviewers available' : 'All added'}
                                        </div>
                                    ) : filteredInterviewers.map(iv => (
                                        <button
                                            key={iv.id}
                                            type="button"
                                            className="si-dropdown-item"
                                            style={{ color: css.inputText }}
                                            onClick={e => {
                                                e.stopPropagation();
                                                setData(d => ({ ...d, interviewers: [...d.interviewers, iv] }));
                                                setInterviewerSearch('');
                                            }}
                                        >
                                            <Initials name={iv.name} size={26} />
                                            <span style={{ fontWeight: 500, fontSize: 14 }}>{iv.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    function Step3() {
        return (
            <div className="si-step-body">
                <h2 className="si-step-title" style={{ color: css.text }}>Notes &amp; Instructions</h2>

                {/* Date & Time row */}
                <div className="si-field-row">
                    <div className="si-field" style={{ flex: 1 }}>
                        <label className="si-label" style={{ color: css.labelColor }}>
                            Date <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: css.subText, pointerEvents: 'none' }} />
                            <input
                                type="date"
                                className="si-input"
                                value={data.date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setData(d => ({ ...d, date: e.target.value }))}
                                style={{ background: css.inputBg, border: `1px solid ${data.date ? css.activeBorder : css.inputBorder}`, color: css.inputText, paddingLeft: 36 }}
                            />
                        </div>
                    </div>
                    <div className="si-field" style={{ flex: 1 }}>
                        <label className="si-label" style={{ color: css.labelColor }}>
                            Time <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Clock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: css.subText, pointerEvents: 'none' }} />
                            <input
                                type="time"
                                className="si-input"
                                value={data.time}
                                onChange={e => setData(d => ({ ...d, time: e.target.value }))}
                                style={{ background: css.inputBg, border: `1px solid ${data.time ? css.activeBorder : css.inputBorder}`, color: css.inputText, paddingLeft: 36 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Internal Notes */}
                <div className="si-field">
                    <label className="si-label" style={{ color: css.labelColor }}>Internal Notes <span style={{ fontSize: 11, opacity: 0.7 }}>(recruiter only)</span></label>
                    <textarea
                        className="si-textarea"
                        placeholder="Add private notes for your team..."
                        value={data.internalNotes}
                        onChange={e => setData(d => ({ ...d, internalNotes: e.target.value }))}
                        style={{ background: css.inputBg, border: `1px solid ${css.inputBorder}`, color: css.inputText }}
                        rows={3}
                    />
                </div>

                {/* Candidate Instructions */}
                <div className="si-field">
                    <label className="si-label" style={{ color: css.labelColor }}>Candidate Instructions <span style={{ fontSize: 11, opacity: 0.7 }}>(visible to candidate)</span></label>
                    <textarea
                        className="si-textarea"
                        placeholder="e.g. Please join 5 minutes early, bring your portfolio..."
                        value={data.candidateInstructions}
                        onChange={e => setData(d => ({ ...d, candidateInstructions: e.target.value }))}
                        style={{ background: css.inputBg, border: `1px solid ${css.inputBorder}`, color: css.inputText }}
                        rows={3}
                    />
                </div>
            </div>
        );
    }

    function Step4() {
        const formatDateTime = () => {
            if (!data.date || !data.time) return '—';
            const d = new Date(`${data.date}T${data.time}`);
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) + ' — ' +
                d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        };

        return (
            <div className="si-step-body">
                <h2 className="si-step-title" style={{ color: css.text }}>Notification &amp; Schedule</h2>

                {/* Notification Options */}
                <div className="si-field">
                    <label className="si-label" style={{ color: css.labelColor }}>Notification Options</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { key: 'notifyCandidate' as const, label: 'Send Email to Candidate', icon: <Mail size={15} /> },
                            { key: 'notifyInterviewerEmail' as const, label: 'Notify Interviewer via Email', icon: <Mail size={15} /> },
                            { key: 'notifyInterviewerSlack' as const, label: 'Notify Interviewer via Slack', icon: <Bell size={15} /> },
                        ].map(opt => (
                            <label key={opt.key} className="si-checkbox-row" style={{ color: css.checkboxLabelColor }}>
                                <input
                                    type="checkbox"
                                    checked={data[opt.key]}
                                    onChange={e => setData(d => ({ ...d, [opt.key]: e.target.checked }))}
                                    className="si-checkbox"
                                />
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: css.accent }}>{opt.icon}</span>
                                    {opt.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Reminder */}
                <div className="si-field">
                    <label className="si-label" style={{ color: css.labelColor }}>Set Reminder</label>
                    <div style={{ position: 'relative', maxWidth: 240 }}>
                        <Clock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: css.subText, pointerEvents: 'none' }} />
                        <select
                            className="si-input"
                            value={data.reminder}
                            onChange={e => setData(d => ({ ...d, reminder: e.target.value }))}
                            style={{ background: css.inputBg, border: `1px solid ${css.inputBorder}`, color: css.inputText, appearance: 'none', paddingLeft: 36, paddingRight: 36 }}
                        >
                            {REMINDERS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: css.subText, pointerEvents: 'none' }} />
                    </div>
                </div>

                {/* Summary Preview */}
                <div className="si-summary-card" style={{ background: css.summaryBg, border: `1px solid ${css.cardBorder}` }}>
                    <div className="si-summary-header" style={{ color: css.accent }}>
                        <CalendarCheck size={16} /> Summary Preview
                    </div>
                    <div className="si-summary-rows">
                        <SummaryRow label="Candidate" value={data.candidateName || '—'} isDark={isDark} css={css} />
                        <SummaryRow label="Job" value={data.jobTitle || '—'} isDark={isDark} css={css} />
                        <SummaryRow label="Interview" value={`${data.round} (${data.interviewType})`} isDark={isDark} css={css} />
                        <SummaryRow label="Interviewers" value={data.interviewers.length > 0 ? data.interviewers.map(i => i.name).join(', ') : 'None assigned'} isDark={isDark} css={css} />
                        <SummaryRow label="Time" value={formatDateTime()} isDark={isDark} css={css} />
                        <SummaryRow label="Reminder" value={data.reminder} isDark={isDark} css={css} />
                    </div>
                </div>
            </div>
        );
    }

    // ─── Main Render ─────────────────────────────────────────────────────────
    return (
        <div className="si-page">
            {/* Page Header */}
            <header className="si-page-header">
                <Link href={`${base}/interviews`} className="si-back-link" style={{ color: css.subText }}>
                    <ArrowLeft size={16} /> Back to Interviews
                </Link>
                <div>
                    <h1 className="si-page-title" style={{ color: css.text }}>Schedule New Interview</h1>
                    <p className="si-page-subtitle" style={{ color: css.subText }}>Fill out the details to schedule a candidate evaluation.</p>
                </div>
            </header>

            {/* Top Progress Bar */}
            <div className="si-progress-bar-wrap">
                {STEPS.map((s, idx) => {
                    const done = step > s.id;
                    const active = step === s.id;
                    return (
                        <div key={s.id} className="si-progress-item">
                            <div className="si-progress-step-label" style={{
                                color: done ? '#10b981' : active ? css.accent : css.subText,
                                fontWeight: active ? 700 : done ? 600 : 400,
                            }}>
                                {done ? <Check size={13} /> : null}
                                {s.id}. {s.label}
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className="si-progress-line" style={{
                                    background: done ? '#10b981' : (isDark ? 'rgba(101,177,208,0.2)' : '#cbd5e1'),
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Main Grid */}
            <div className="si-main-grid">
                {/* Left: Step Panel */}
                <aside className="si-step-panel" style={{ background: css.cardBg, border: `1px solid ${css.cardBorder}`, boxShadow: css.shadowCard }}>
                    {STEPS.map(s => {
                        const done = step > s.id;
                        const active = step === s.id;
                        return (
                            <div
                                key={s.id}
                                className={`si-step-item ${active ? 'active' : ''} ${done ? 'done' : ''}`}
                                style={{
                                    background: active ? css.activeBg : done ? css.doneBg : 'transparent',
                                    border: `1.5px solid ${active ? css.activeBorder : done ? 'rgba(16,185,129,0.4)' : 'transparent'}`,
                                    color: active ? css.accent : done ? '#10b981' : css.subText,
                                }}
                            >
                                <span className="si-step-dot" style={{
                                    background: active ? css.accent : done ? '#10b981' : (isDark ? 'rgba(101,177,208,0.3)' : '#94a3b8'),
                                }}>
                                    {done ? <Check size={12} color="#fff" /> : <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{s.id}</span>}
                                </span>
                                <span style={{ fontWeight: active ? 700 : done ? 600 : 400 }}>{s.id}. {s.label}</span>
                            </div>
                        );
                    })}
                </aside>

                {/* Right: Content Card */}
                <div className="si-content-card" style={{ background: css.cardBg, border: `1px solid ${css.cardBorder}`, boxShadow: css.shadowCard }}>
                    {renderStep()}

                    {/* Action Footer */}
                    <div className="si-card-footer" style={{ borderTop: `1px solid ${isDark ? 'rgba(101,177,208,0.18)' : '#e2e8f0'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            {/* Back */}
                            {step > 1 ? (
                                <button type="button" className="si-btn-back" onClick={() => setStep(s => s - 1)}
                                    style={{ background: isDark ? 'rgba(101,177,208,0.1)' : '#f1f5f9', border: `1px solid ${css.inputBorder}`, color: isDark ? '#9dc3d3' : '#64748b' }}>
                                    <ArrowLeft size={15} /> Back
                                </button>
                            ) : (
                                <div />
                            )}

                            {/* Next / Submit */}
                            {step < 4 ? (
                                <button
                                    type="button"
                                    className="si-btn-next"
                                    disabled={!canNext()}
                                    onClick={() => setStep(s => s + 1)}
                                    style={{ opacity: canNext() ? 1 : 0.45, cursor: canNext() ? 'pointer' : 'not-allowed' }}
                                >
                                    Next: {STEPS[step].label} <ArrowRight size={15} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="si-btn-submit"
                                    disabled={submitting || !data.applicationId}
                                    onClick={handleSubmit}
                                    style={{ opacity: (submitting || !data.applicationId) ? 0.6 : 1 }}
                                >
                                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Scheduling...</> : <><CalendarCheck size={16} /> Schedule Interview</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Small reusable summary row
function SummaryRow({ label, value, css }: { label: string; value: string; isDark: boolean; css: Record<string, string> }) {
    return (
        <div className="si-summary-row">
            <span className="si-summary-label" style={{ color: css.subText }}>{label}:</span>
            <span className="si-summary-value" style={{ color: css.text }}>{value}</span>
        </div>
    );
}
