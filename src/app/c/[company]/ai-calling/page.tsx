'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRecruiterBasePath } from '@/components/RecruiterBasePathContext';
import {
    Phone,
    PhoneCall,
    PhoneOff,
    Plus,
    Trash2,
    Search,
    ChevronDown,
    ChevronUp,
    Play,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    FileText,
    Loader2,
    PhoneMissed,
    MessageSquare,
    ArrowLeft,
    RefreshCw,
} from 'lucide-react';

type Job = { id: string; title: string; company: string; status: string };
type Question = { id?: string; _key: string; question: string; order: number };
type Candidate = {
    applicationId: string;
    candidateId: string;
    name: string;
    email: string;
    phone?: string;
    status: string;
    avatar?: string;
};
type CallRecord = {
    id: string;
    status: string;
    phoneNumber: string;
    callDuration?: number;
    transcript?: string;
    summary?: string;
    questions: string[];
    createdAt: string;
    completedAt?: string;
    candidate?: { id: string; name: string; email: string; profileImageUrl?: string };
    job?: { id: string; title: string; company: string };
};

type ActiveTab = 'questions' | 'candidates' | 'history' | 'detail';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
    COMPLETED: { bg: '#ecfdf5', color: '#10b981' },
    IN_PROGRESS: { bg: '#eff6ff', color: '#3b82f6' },
    QUEUED: { bg: '#fffbeb', color: '#f59e0b' },
    FAILED: { bg: '#fef2f2', color: '#ef4444' },
    NO_ANSWER: { bg: '#fff7ed', color: '#f97316' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    COMPLETED: <CheckCircle2 size={16} />,
    IN_PROGRESS: <Loader2 size={16} className="ai-calling-spinner" />,
    QUEUED: <Clock size={16} />,
    FAILED: <XCircle size={16} />,
    NO_ANSWER: <PhoneMissed size={16} />,
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_STYLES[status] ?? { bg: '#f3f4f6', color: '#6b7280' };
    return (
        <span
            className="ai-calling-status-badge"
            style={{ backgroundColor: s.bg, color: s.color }}
        >
            {status.split('_').join(' ')}
        </span>
    );
}

function StatusIcon({ status }: { status: string }) {
    const s = STATUS_STYLES[status] ?? { bg: '#f3f4f6', color: '#6b7280' };
    return (
        <div className="ai-calling-call-icon" style={{ backgroundColor: s.bg, color: s.color }}>
            {STATUS_ICONS[status] ?? <AlertCircle size={16} />}
        </div>
    );
}

function formatDuration(seconds?: number) {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AICallingPage() {
    const base = useRecruiterBasePath();
    const slug = base.split('/').filter(Boolean).pop() || '';

    const [activeTab, setActiveTab] = useState<ActiveTab>('questions');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [calls, setCalls] = useState<CallRecord[]>([]);
    const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [callingId, setCallingId] = useState<string | null>(null);
    const [phoneOverrides, setPhoneOverrides] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        if (selectedJobId) {
            fetchQuestions();
            fetchCandidates();
            fetchCalls();
        }
    }, [selectedJobId]);

    const fetchJobs = async () => {
        try {
            const res = await fetch(`/api/company/jobs?slug=${encodeURIComponent(slug)}`);
            if (!res.ok) throw new Error('Failed to load jobs');
            const data = await res.json();
            const jobList = Array.isArray(data) ? data : (data?.data || []);
            setJobs(jobList);
            if (jobList.length > 0 && !selectedJobId) {
                setSelectedJobId(jobList[0].id);
            }
        } catch {
            setError('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async () => {
        try {
            const res = await fetch(
                `/api/ai-calling/questions?jobId=${selectedJobId}&slug=${encodeURIComponent(slug)}`
            );
            if (!res.ok) throw new Error('Failed to load questions');
            const data = await res.json();
            setQuestions(
                (data.data || []).map((q: Question & { id: string }) => ({
                    id: q.id,
                    _key: q.id || crypto.randomUUID(),
                    question: q.question,
                    order: q.order,
                }))
            );
        } catch {
            setQuestions([]);
        }
    };

    const fetchCandidates = async () => {
        try {
            const res = await fetch(
                `/api/company/applications?slug=${encodeURIComponent(slug)}&jobId=${selectedJobId}`
            );
            if (!res.ok) throw new Error('Failed');
            const raw = await res.json();
            const list = Array.isArray(raw) ? raw : (raw?.data || []);
            type AppItem = {
                id: string;
                candidateId: string;
                candidate?: { name?: string; email?: string; profileImageUrl?: string | null };
                status?: string;
            };
            setCandidates(
                list.map((app: AppItem) => ({
                    applicationId: app.id,
                    candidateId: app.candidateId,
                    name: app.candidate?.name || 'Unknown',
                    email: app.candidate?.email || '',
                    status: app.status || 'APPLIED',
                    avatar: app.candidate?.profileImageUrl ?? undefined,
                }))
            );
        } catch {
            setCandidates([]);
        }
    };

    const fetchCalls = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/ai-calling/calls?slug=${encodeURIComponent(slug)}&jobId=${selectedJobId}`
            );
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setCalls(data.data || []);
        } catch {
            setCalls([]);
        }
    }, [slug, selectedJobId]);

    const saveQuestions = async () => {
        if (questions.length === 0) {
            setError('Add at least one question');
            return;
        }
        if (questions.find((q) => !q.question.trim())) {
            setError('All questions must have text');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/ai-calling/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: selectedJobId,
                    slug,
                    questions: questions.map((q, i) => ({ question: q.question, order: i })),
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save');
            }
            setSuccess('Questions saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
            await fetchQuestions();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save questions');
        } finally {
            setSaving(false);
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, { _key: crypto.randomUUID(), question: '', order: questions.length }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, text: string) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], question: text };
        setQuestions(updated);
    };

    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === questions.length - 1)
        )
            return;
        const updated = [...questions];
        const swapIdx = direction === 'up' ? index - 1 : index + 1;
        [updated[index], updated[swapIdx]] = [updated[swapIdx], updated[index]];
        setQuestions(updated);
    };

    const initiateCall = async (applicationId: string) => {
        setCallingId(applicationId);
        setError('');
        try {
            const body: { applicationId: string; phoneNumber?: string } = { applicationId };
            if (phoneOverrides[applicationId]) {
                body.phoneNumber = phoneOverrides[applicationId];
            }
            const res = await fetch('/api/ai-calling/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to initiate call');
            setSuccess(`Call initiated to ${data.data?.candidateName || 'candidate'}!`);
            setTimeout(() => setSuccess(''), 5000);
            await fetchCalls();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to initiate call');
        } finally {
            setCallingId(null);
        }
    };

    const viewCallDetail = async (callId: string) => {
        try {
            const res = await fetch(
                `/api/ai-calling/calls/${callId}?slug=${encodeURIComponent(slug)}`
            );
            if (!res.ok) throw new Error('Failed to load call details');
            const data = await res.json();
            setSelectedCall(data.data);
            setActiveTab('detail');
        } catch {
            setError('Failed to load call details');
        }
    };

    const selectedJob = jobs.find((j) => j.id === selectedJobId);
    const filteredCandidates = candidates.filter(
        (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    const tabs: { key: ActiveTab; label: string; icon: typeof Phone; count: number }[] = [
        { key: 'questions', label: 'Screening Questions', icon: MessageSquare, count: questions.length },
        { key: 'candidates', label: 'Call Candidates', icon: PhoneCall, count: candidates.length },
        { key: 'history', label: 'Call History', icon: Clock, count: calls.length },
    ];

    return (
        <div className="dashboard-page-content">
            {/* ── Header ── */}
            <header className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">AI Calling Agent</h1>
                    <p className="page-subtitle">
                        Screen candidates automatically with AI-powered phone calls.
                    </p>
                </div>
            </header>

            {/* ── Alerts ── */}
            {error && (
                <div className="ai-calling-alert ai-calling-alert--error">
                    <XCircle size={16} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{error}</span>
                    <button onClick={() => setError('')} className="alert-dismiss">
                        <XCircle size={14} />
                    </button>
                </div>
            )}
            {success && (
                <div className="ai-calling-alert ai-calling-alert--success">
                    <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                    <span>{success}</span>
                </div>
            )}

            {/* ── Job Selector ── */}
            <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                        Select Job
                    </label>
                    <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '420px' }}>
                        <select
                            className="form-input"
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
                            style={{ paddingRight: '36px' }}
                        >
                            <option value="">Choose a job...</option>
                            {jobs.map((job) => (
                                <option key={job.id} value={job.id}>
                                    {job.title} ({job.status})
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={16}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                opacity: 0.4,
                            }}
                        />
                    </div>
                    {selectedJob && <StatusBadge status={selectedJob.status} />}
                </div>
            </div>

            {/* ── Empty state: no job selected ── */}
            {!selectedJobId && (
                <div className="ai-calling-empty">
                    <Phone size={48} strokeWidth={1.5} />
                    <h3>Select a job to get started</h3>
                    <p>
                        Choose a job position above to configure screening questions and call
                        candidates.
                    </p>
                </div>
            )}

            {/* ── Main content when job is selected ── */}
            {selectedJobId && (
                <>
                    {/* Tabs */}
                    <div className="ai-calling-tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`ai-calling-tab ${activeTab === tab.key ? 'active' : ''}`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                <span className="ai-calling-tab-count">{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* ─── Tab: Screening Questions ─── */}
                    {activeTab === 'questions' && (
                        <div className="card" style={{ padding: '24px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '20px',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                                        Screening Questions
                                    </h3>
                                    <p
                                        className="page-subtitle"
                                        style={{ margin: '4px 0 0', fontSize: '13px' }}
                                    >
                                        Configure the questions the AI will ask during the call.
                                    </p>
                                </div>
                                <button
                                    onClick={addQuestion}
                                    className="btn-primary"
                                    style={{ padding: '8px 16px', fontSize: '13px' }}
                                >
                                    <Plus size={16} />
                                    Add Question
                                </button>
                            </div>

                            {questions.length === 0 ? (
                                <div
                                    style={{
                                        textAlign: 'center',
                                        padding: '40px 24px',
                                        border: '2px dashed #e5e7eb',
                                        borderRadius: '12px',
                                    }}
                                >
                                    <MessageSquare
                                        size={36}
                                        strokeWidth={1.5}
                                        style={{ color: '#9ca3af', margin: '0 auto 12px', display: 'block' }}
                                    />
                                    <p style={{ margin: '0 0 16px' }}>
                                        No screening questions yet.
                                    </p>
                                    <button
                                        onClick={addQuestion}
                                        className="btn-secondary"
                                        style={{ padding: '8px 16px', fontSize: '13px' }}
                                    >
                                        <Plus size={14} />
                                        Add your first question
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {questions.map((q, index) => (
                                        <div key={q._key} className="ai-calling-question-row">
                                            <div className="ai-calling-q-reorder">
                                                <button
                                                    onClick={() => moveQuestion(index, 'up')}
                                                    disabled={index === 0}
                                                    title="Move up"
                                                >
                                                    <ChevronUp size={12} />
                                                </button>
                                                <button
                                                    onClick={() => moveQuestion(index, 'down')}
                                                    disabled={index === questions.length - 1}
                                                    title="Move down"
                                                >
                                                    <ChevronDown size={12} />
                                                </button>
                                            </div>
                                            <span className="ai-calling-q-number">{index + 1}</span>
                                            <textarea
                                                value={q.question}
                                                onChange={(e) => updateQuestion(index, e.target.value)}
                                                placeholder="e.g., Can you describe your experience with React and TypeScript?"
                                                className="form-input"
                                                rows={2}
                                                style={{
                                                    flex: '1 1 200px',
                                                    resize: 'vertical',
                                                    minHeight: '42px',
                                                }}
                                            />
                                            <button
                                                onClick={() => removeQuestion(index)}
                                                title="Remove question"
                                                className="ai-calling-q-delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {questions.length > 0 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        gap: '10px',
                                        marginTop: '20px',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <button
                                        onClick={addQuestion}
                                        className="btn-secondary"
                                        style={{ padding: '8px 16px', fontSize: '13px' }}
                                    >
                                        <Plus size={14} />
                                        Add Another
                                    </button>
                                    <button
                                        onClick={saveQuestions}
                                        disabled={saving}
                                        className="btn-primary"
                                        style={{ padding: '8px 20px', fontSize: '13px' }}
                                    >
                                        {saving ? (
                                            <Loader2 size={14} className="ai-calling-spinner" />
                                        ) : (
                                            <CheckCircle2 size={14} />
                                        )}
                                        {saving ? 'Saving...' : 'Save Questions'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Tab: Call Candidates ─── */}
                    {activeTab === 'candidates' && (
                        <div>
                            {questions.length === 0 && (
                                <div className="ai-calling-alert ai-calling-alert--warning">
                                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                    <span>
                                        Configure screening questions first before calling candidates.{' '}
                                        <button
                                            onClick={() => setActiveTab('questions')}
                                            style={{
                                                fontWeight: '600',
                                                color: 'inherit',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                padding: 0,
                                            }}
                                        >
                                            Set up questions
                                        </button>
                                    </span>
                                </div>
                            )}

                            <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search
                                        size={18}
                                        style={{
                                            position: 'absolute',
                                            left: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            opacity: 0.4,
                                            pointerEvents: 'none',
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search candidates by name or email..."
                                        className="form-input"
                                        style={{ paddingLeft: '40px' }}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {filteredCandidates.length > 0 ? (
                                    filteredCandidates.map((candidate) => {
                                        const existingCall = calls.find(
                                            (c) =>
                                                c.candidate?.id === candidate.candidateId &&
                                                ['QUEUED', 'IN_PROGRESS'].includes(c.status)
                                        );
                                        const isCalling = callingId === candidate.applicationId;
                                        const isDisabled =
                                            isCalling || questions.length === 0 || !!existingCall;

                                        return (
                                            <div
                                                key={candidate.applicationId}
                                                className="card ai-calling-candidate-card"
                                            >
                                                <div className="ai-calling-candidate-avatar">
                                                    {candidate.avatar ? (
                                                        <img src={candidate.avatar} alt="" />
                                                    ) : (
                                                        candidate.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>

                                                <div className="ai-calling-candidate-info">
                                                    <p className="ai-calling-candidate-name">
                                                        {candidate.name}
                                                    </p>
                                                    <p className="ai-calling-candidate-email">
                                                        {candidate.email}
                                                    </p>
                                                </div>

                                                <StatusBadge status={candidate.status} />

                                                <div className="ai-calling-candidate-actions">
                                                    <input
                                                        type="tel"
                                                        placeholder={candidate.phone || '+1 234 567 8900'}
                                                        className="form-input ai-calling-phone-input"
                                                        value={
                                                            phoneOverrides[candidate.applicationId] || ''
                                                        }
                                                        onChange={(e) =>
                                                            setPhoneOverrides((prev) => ({
                                                                ...prev,
                                                                [candidate.applicationId]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                    <button
                                                        onClick={() =>
                                                            initiateCall(candidate.applicationId)
                                                        }
                                                        disabled={isDisabled}
                                                        className="btn-primary"
                                                        title={
                                                            existingCall
                                                                ? 'Call already in progress'
                                                                : questions.length === 0
                                                                  ? 'Add questions first'
                                                                  : 'Start AI call'
                                                        }
                                                        style={{
                                                            padding: '8px 16px',
                                                            fontSize: '13px',
                                                            whiteSpace: 'nowrap',
                                                            opacity: isDisabled ? 0.5 : 1,
                                                        }}
                                                    >
                                                        {isCalling ? (
                                                            <Loader2
                                                                size={14}
                                                                className="ai-calling-spinner"
                                                            />
                                                        ) : existingCall ? (
                                                            <PhoneCall size={14} />
                                                        ) : (
                                                            <Play size={14} />
                                                        )}
                                                        {existingCall ? 'In Progress' : 'Call'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="ai-calling-empty">
                                        <PhoneOff size={40} strokeWidth={1.5} />
                                        <h3>No candidates found</h3>
                                        <p>
                                            {searchQuery
                                                ? 'No candidates match your search.'
                                                : 'Candidates who apply to this job will appear here.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── Tab: Call History ─── */}
                    {activeTab === 'history' && (
                        <div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    marginBottom: '16px',
                                }}
                            >
                                <button
                                    onClick={fetchCalls}
                                    className="btn-secondary"
                                    style={{ padding: '8px 14px', fontSize: '13px' }}
                                >
                                    <RefreshCw size={14} />
                                    Refresh
                                </button>
                            </div>

                            {calls.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {calls.map((call) => (
                                        <div
                                            key={call.id}
                                            className={`card ai-calling-call-card ${call.status === 'COMPLETED' ? 'clickable' : ''}`}
                                            onClick={() =>
                                                call.status === 'COMPLETED' &&
                                                viewCallDetail(call.id)
                                            }
                                        >
                                            <StatusIcon status={call.status} />

                                            <div style={{ minWidth: 0 }}>
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        fontWeight: '600',
                                                        fontSize: '14px',
                                                    }}
                                                >
                                                    {call.candidate?.name || 'Unknown'}
                                                </p>
                                                <p className="ai-calling-candidate-email">
                                                    {call.phoneNumber} &middot;{' '}
                                                    {call.job?.title || 'Unknown Job'}
                                                </p>
                                            </div>

                                            <StatusBadge status={call.status} />

                                            <div className="ai-calling-call-meta">
                                                <span>
                                                    <Clock size={12} />
                                                    {formatDuration(call.callDuration)}
                                                </span>
                                                <span>
                                                    {new Date(call.createdAt).toLocaleDateString(
                                                        undefined,
                                                        {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        }
                                                    )}
                                                </span>
                                            </div>

                                            {call.status === 'COMPLETED' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        viewCallDetail(call.id);
                                                    }}
                                                    className="btn-secondary"
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    <FileText size={12} />
                                                    View Details
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="ai-calling-empty">
                                    <Clock size={40} strokeWidth={1.5} />
                                    <h3>No calls yet</h3>
                                    <p>
                                        Calls you initiate for this job will appear here with
                                        transcripts and AI summaries.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── Tab: Call Detail ─── */}
                    {activeTab === 'detail' && selectedCall && (
                        <div>
                            <button
                                onClick={() => setActiveTab('history')}
                                className="ai-calling-back-btn"
                            >
                                <ArrowLeft size={16} />
                                Back to Call History
                            </button>

                            {/* Call header card */}
                            <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                                <div className="ai-calling-detail-header">
                                    <div>
                                        <h3
                                            style={{
                                                margin: 0,
                                                fontSize: '18px',
                                                fontWeight: '700',
                                            }}
                                        >
                                            Call with{' '}
                                            {selectedCall.candidate?.name || 'Unknown'}
                                        </h3>
                                        <p
                                            className="page-subtitle"
                                            style={{ margin: '4px 0 0', fontSize: '13px' }}
                                        >
                                            {selectedCall.job?.title} at{' '}
                                            {selectedCall.job?.company} &middot;{' '}
                                            {selectedCall.phoneNumber}
                                        </p>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                        }}
                                    >
                                        <StatusBadge status={selectedCall.status} />
                                        <span
                                            style={{ fontSize: '13px' }}
                                            className="ai-calling-candidate-email"
                                        >
                                            Duration: {formatDuration(selectedCall.callDuration)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Questions Asked */}
                            <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                                <h4 className="ai-calling-section-title">
                                    <MessageSquare size={16} />
                                    Questions Asked
                                </h4>
                                <ol
                                    style={{
                                        margin: 0,
                                        paddingLeft: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                    }}
                                >
                                    {selectedCall.questions.map((q, i) => (
                                        <li
                                            key={i}
                                            style={{
                                                fontSize: '14px',
                                                lineHeight: '1.6',
                                            }}
                                        >
                                            {q}
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {/* AI Summary */}
                            {selectedCall.summary && (
                                <div
                                    className="card"
                                    style={{ padding: '24px', marginBottom: '16px' }}
                                >
                                    <h4 className="ai-calling-section-title">
                                        <CheckCircle2
                                            size={16}
                                            style={{ color: '#10b981' }}
                                        />
                                        AI Summary
                                    </h4>
                                    <div
                                        style={{
                                            fontSize: '14px',
                                            lineHeight: '1.7',
                                            whiteSpace: 'pre-wrap',
                                        }}
                                    >
                                        {selectedCall.summary}
                                    </div>
                                </div>
                            )}

                            {/* Full Transcript */}
                            {selectedCall.transcript && (
                                <div className="card" style={{ padding: '24px' }}>
                                    <h4 className="ai-calling-section-title">
                                        <FileText size={16} />
                                        Full Transcript
                                    </h4>
                                    <div className="ai-calling-transcript-box">
                                        {selectedCall.transcript}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
