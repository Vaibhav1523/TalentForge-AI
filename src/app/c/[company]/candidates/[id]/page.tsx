'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRecruiterBasePath } from '@/components/RecruiterBasePathContext';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    DollarSign,
    Clock,
    Download,
    ExternalLink,
    Linkedin,
    Github,
    Twitter,
    Loader2,
    Building2,
    CheckCircle2,
    XCircle
} from 'lucide-react';

function getFilenameFromUrl(url: string | null | undefined): string {
    if (!url) return 'Resume';
    try {
        const pathname = new URL(url).pathname;
        const parts = pathname.split('/');
        const filename = parts[parts.length - 1];
        return filename ? decodeURIComponent(filename) : 'Resume';
    } catch {
        // Bare object name like "resumes/userId-timestamp-name.pdf"
        const parts = url.split('/');
        const last = parts[parts.length - 1];
        try {
            return last ? decodeURIComponent(last) : 'Resume';
        } catch {
            return last || 'Resume';
        }
    }
}

/** Build a safe https URL for recruiter-facing social links (candidate may store handle or full URL). */
function resolveSocialUrl(
    raw: string | null | undefined,
    network: 'linkedin' | 'github' | 'twitter'
): string | null {
    if (!raw?.trim()) return null;
    const t = raw.trim();
    const tryParse = (s: string): string | null => {
        try {
            const u = new URL(s);
            return ['http:', 'https:'].includes(u.protocol) ? u.href : null;
        } catch {
            return null;
        }
    };
    if (/^https?:\/\//i.test(t)) return tryParse(t);
    if (network === 'linkedin') {
        if (/linkedin\.com/i.test(t)) return tryParse(`https://${t.replace(/^\/+/, '')}`);
        const h = t.replace(/^@/, '').replace(/^\/+/, '').replace(/^in\//i, '');
        if (!h || /\s/.test(h)) return null;
        return `https://www.linkedin.com/in/${encodeURIComponent(h)}`;
    }
    if (network === 'github') {
        if (/github\.com/i.test(t)) return tryParse(`https://${t.replace(/^\/+/, '')}`);
        const h = t.replace(/^@/, '').replace(/^\/+/, '');
        if (!h || /\s/.test(h)) return null;
        return `https://github.com/${encodeURIComponent(h)}`;
    }
    if (network === 'twitter') {
        if (/twitter\.com|x\.com/i.test(t)) return tryParse(`https://${t.replace(/^\/+/, '')}`);
        const h = t.replace(/^@/, '').replace(/^\/+/, '');
        if (!h || /\s/.test(h)) return null;
        return `https://twitter.com/${encodeURIComponent(h)}`;
    }
    return null;
}

function isValidResumeUrl(url: string): boolean {
    // Allow bare GCS object names stored by /api/upload/resume
    if (url.startsWith('resumes/') && !url.includes('..')) return true;
    // Allow legacy internal paths
    if (url.startsWith('/private-resumes/') || url.startsWith('/uploads/resumes/')) return true;
    // Allow corrupted-but-recoverable format (https://resumes/...)
    if (/^https:\/\/resumes\//.test(url)) return true;
    // Allow proper https/http URLs
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

function RenderMotivation({ content }: { content: string }) {
    let blocks;
    try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.blocks)) {
            blocks = parsed.blocks;
        }
    } catch {
        /* Invalid JSON; render as plain text below */
    }

    if (!blocks) {
        return <div>{content}</div>;
    }

    return (
        <div className="prose prose-sm max-w-none">
            {blocks.map((block: { type: string; id: string; data?: { level?: number; text?: string; style?: string; items?: string[] } }, idx: number) => {
                switch (block.type) {
                    case 'header': {
                        const level = Math.min(6, Math.max(1, block.data?.level ?? 1));
                        const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
                        return <Tag key={block.id ?? `block-${idx}`} className="font-bold my-2" style={{ fontSize: level === 1 ? '1.5em' : level === 2 ? '1.25em' : '1.1em' }}>{block.data?.text ?? ''}</Tag>;
                    }
                    case 'paragraph':
                        return <p key={block.id ?? `block-${idx}`} className="my-2">{block.data?.text ?? ''}</p>;
                    case 'list': {
                        const listStyle = block.data?.style === 'ordered' ? 'ordered' : 'unordered';
                        const ListTag = listStyle === 'ordered' ? 'ol' : 'ul';
                        return (
                            <ListTag key={block.id ?? `block-${idx}`} className="list-inside my-2" style={{ listStyleType: listStyle === 'ordered' ? 'decimal' : 'disc', paddingLeft: '20px' }}>
                                {(block.data?.items ?? []).map((item: string, i: number) => (
                                    <li key={`item-${idx}-${i}`}>{item}</li>
                                ))}
                            </ListTag>
                        );
                    }
                    case 'quote':
                        return <blockquote key={block.id ?? `block-${idx}`} className="border-l-4 border-gray-300 pl-4 italic my-2">{block.data?.text ?? ''}</blockquote>;
                    case 'delimiter':
                        return <div key={block.id ?? `block-${idx}`} className="my-4 text-center">***</div>;
                    default:
                        return null;
                }
            })}
        </div>
    );
}

/** Shape of application from GET /api/company/applications/[id] */
interface ApplicationWithCandidate {
    id: string;
    status: string;
    appliedAt: string;
    city?: string | null;
    interviewScheduledAt?: string | null;
    currentCTC?: string | number | null;
    currentCurrency?: string | null;
    expectedCTC?: string | number | null;
    expectedCurrency?: string | null;
    noticePeriod?: string | null;
    motivation?: string | null;
    resumeUrl?: string | null;
    candidate?: {
        name?: string;
        email?: string;
        profileImageUrl?: string | null;
        linkedin?: string | null;
        github?: string | null;
        twitter?: string | null;
    } | null;
    job?: {
        title?: string;
        employmentType?: string;
        experienceMin?: number | null;
        experienceMax?: number | null;
    } | null;
}

export default function CandidateProfilePage({ params }: { params: { id: string } }) {
    const base = useRecruiterBasePath();
    const [application, setApplication] = useState<ApplicationWithCandidate | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [notFoundState, setNotFoundState] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);

    const [scheduledDate, setScheduledDate] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);

    const fetchApplication = useCallback(async () => {
        setFetchError(null);
        setNotFoundState(false);
        setLoading(true);
        try {
            const id = Array.isArray(params.id) ? params.id[0] : params.id;
            const res = await fetch(`/api/company/applications/${id}`);
            if (res.status === 404) {
                setNotFoundState(true);
                return;
            }
            if (!res.ok) {
                throw new Error('Failed to fetch candidate profile');
            }
            const data = (await res.json()) as ApplicationWithCandidate;
            setApplication(data);
            if (data.interviewScheduledAt) {
                const d = new Date(data.interviewScheduledAt);
                const year = d.getUTCFullYear();
                const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                const day = String(d.getUTCDate()).padStart(2, '0');
                setScheduledDate(`${year}-${month}-${day}`);
            }
        } catch (error) {
            setFetchError(error instanceof Error ? error.message : 'Failed to load candidate');
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchApplication();
    }, [fetchApplication]);

    const handleStatusUpdate = async (newStatus: string, date?: string) => {
        if (!application) return;
        setStatusUpdating(true);
        try {
            const payload: { status: string; interviewScheduledAt?: string } = { status: newStatus };
            if (date) {
                const [year, month, day] = date.split('-').map(Number);
                const localDate = new Date(year, month - 1, day, 12);
                payload.interviewScheduledAt = localDate.toISOString();
            }

            const res = await fetch(`/api/company/applications/${application.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updated = (await res.json()) as ApplicationWithCandidate;
                setApplication((prev) =>
                    prev ? { ...prev, ...updated, candidate: prev.candidate } : updated
                );
                toast.success(`Status updated to ${newStatus}`);
                setIsScheduling(false);
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error updating status');
        } finally {
            setStatusUpdating(false);
        }
    };

    // 🛡️ SECURITY: URL Protocol Validation (XSS Prevention)
    const isSafeUrl = (url: string) => {
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );

    if (notFoundState) {
        return <div style={{ padding: '32px', textAlign: 'center' }}>Candidate not found</div>;
    }

    if (!application) {
        if (fetchError) {
            return (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                    <p style={{ marginBottom: '16px', color: '#6b7280' }}>{fetchError}</p>
                    <button type="button" onClick={fetchApplication} className="btn-primary">Try again</button>
                </div>
            );
        }
        return <div style={{ padding: '32px', textAlign: 'center' }}>Loading...</div>;
    }

    const { candidate, job } = application;

    // Helper for Status Badge
    const getStatusStyle = (status: string) => {
        const baseStyle = {
            padding: '6px 16px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: '600',
            textTransform: 'capitalize' as const,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
        };
        switch (status) {
            case 'HIRED': return { ...baseStyle, backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
            case 'INTERVIEW': return { ...baseStyle, backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe' };
            case 'REJECTED': return { ...baseStyle, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
            case 'WITHDRAWN': return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' };
            default: return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
        }
    };

    const statusStyle = getStatusStyle(application.status);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            <Link href={`${base}/candidates`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: '#6b7280', textDecoration: 'none', fontWeight: '500' }}>
                <ArrowLeft size={18} /> Back to Candidates
            </Link>

            {/* Header Profile Card */}
            <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>

                    {/* Key Info */}
                    <div style={{ display: 'flex', gap: '24px', flex: 1, flexWrap: 'wrap' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden',
                            backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '28px', fontWeight: 'bold', color: '#2563eb', flexShrink: 0
                        }}>
                            {candidate?.profileImageUrl && isSafeUrl(candidate.profileImageUrl) ? (
                                <img src={candidate.profileImageUrl} alt={candidate.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                (candidate?.name || 'U').charAt(0).toUpperCase()
                            )}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                                <div>
                                    <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                                        {candidate?.name || 'Unknown Candidate'}
                                    </h1>
                                    <p style={{ margin: 0, color: '#6b7280', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        Applied for <span style={{ fontWeight: '600', color: '#374151' }}>{job?.title}</span>
                                        <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                                            {job?.employmentType}
                                        </span>
                                        {(job?.experienceMin != null || job?.experienceMax != null) && (
                                            <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: '600' }}>
                                                {job.experienceMin != null && job.experienceMax != null
                                                    ? `${job.experienceMin}-${job.experienceMax} Yrs Exp Required`
                                                    : job.experienceMin != null
                                                        ? `${job.experienceMin}+ Yrs Exp Required`
                                                        : `Up to ${job.experienceMax} Yrs Exp Required`
                                                }
                                            </span>
                                        )}
                                    </p>
                                </div>

                                <span style={statusStyle}>
                                    {application.status}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                                    <Mail size={16} style={{ color: '#9ca3af' }} />
                                    <span>{candidate?.email || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                                    <MapPin size={16} style={{ color: '#9ca3af' }} />
                                    <span>{application.city || 'Location not specified'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                                    <Calendar size={16} style={{ color: '#9ca3af' }} />
                                    <span>
                                        {application.status === 'INTERVIEW' && application.interviewScheduledAt
                                            ? `Interview Scheduled: ${new Date(application.interviewScheduledAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
                                            : `Applied ${new Date(application.appliedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>

                {/* Left Column: Details */}
                <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Professional Details */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Briefcase size={20} style={{ color: '#3b82f6' }} /> Professional Details
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Current CTC</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#111827' }}>
                                    <span style={{ color: '#9ca3af', fontWeight: '400', fontSize: '13px' }}>{application.currentCurrency || 'USD'}</span>
                                    {application.currentCTC && application.currentCTC !== '0' ? application.currentCTC : 'Not Provided'}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Expected CTC</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#111827' }}>
                                    <span style={{ color: '#9ca3af', fontWeight: '400', fontSize: '13px' }}>{application.expectedCurrency || 'USD'}</span>
                                    {application.expectedCTC && application.expectedCTC !== '0' ? application.expectedCTC : 'Not Provided'}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Notice Period</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#111827' }}>
                                    <Clock size={16} style={{ color: '#9ca3af' }} />
                                    {application.noticePeriod || 'Immediate'}
                                </div>
                            </div>
                        </div>

                        {application.motivation && (
                            <div style={{ marginTop: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Motivation / Cover Letter</label>
                                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', color: '#4b5563', fontSize: '14px', lineHeight: '1.6' }}>
                                    <RenderMotivation content={application.motivation} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resume Section */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Download size={20} style={{ color: '#3b82f6' }} /> Resume / CV
                        </h2>

                        {application.resumeUrl ? (
                            isValidResumeUrl(application.resumeUrl) ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                    <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', color: '#2563eb' }}>
                                        <Briefcase size={24} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600', color: '#111827' }}>{getFilenameFromUrl(application.resumeUrl)}</h3>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Provided with application</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        <a
                                            href={`/api/resume/view?url=${encodeURIComponent(application.resumeUrl)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-primary"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                                            title="View resume (PDF opens in browser, DOCX downloads)"
                                        >
                                            <ExternalLink size={16} /> View
                                        </a>
                                        <a
                                            href={`/api/resume/view?url=${encodeURIComponent(application.resumeUrl)}&download=1`}
                                            className="btn-secondary"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '8px 14px' }}
                                            title="Download resume"
                                            download
                                        >
                                            <Download size={16} />
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ color: '#dc2626', fontStyle: 'italic' }}>Resume URL is invalid or unsafe and cannot be displayed.</p>
                            )
                        ) : (
                            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No resume attached.</p>
                        )}
                    </div>
                </div>

                {/* Right Column: Status & Contact */}
                <div style={{ flex: '1 1 300px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Status Management */}
                    <div className="card" style={{ padding: '24px', opacity: application.status === 'WITHDRAWN' ? 0.6 : 1 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#111827' }}>Update Status</h3>
                        {application.status === 'WITHDRAWN' ? (
                            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                                    Application Withdrawn by Candidate
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {isScheduling ? (
                                    <div style={{ padding: '16px', border: '1px solid #dbeafe', borderRadius: '12px', backgroundColor: '#f0f9ff' }}>
                                        <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600', color: '#0369a1' }}>Schedule Interview Date</p>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            style={{ marginBottom: '12px', width: '100%' }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleStatusUpdate('INTERVIEW', scheduledDate)}
                                                disabled={statusUpdating || !scheduledDate}
                                                className="btn-primary"
                                                style={{ flex: 1, height: '40px', fontSize: '13px' }}
                                            >
                                                {statusUpdating ? 'Updating...' : 'Confirm'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsScheduling(false)}
                                                className="btn-secondary"
                                                style={{ flex: 1, height: '40px', fontSize: '13px' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsScheduling(true)}
                                        disabled={statusUpdating}
                                        style={{
                                            padding: '12px', borderRadius: '8px', border: '1px solid #dbeafe',
                                            backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '600', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <Calendar size={18} /> {application.status === 'INTERVIEW' ? 'Reschedule Interview' : 'Move to Interview'}
                                    </button>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusUpdate('HIRED')}
                                        disabled={statusUpdating}
                                        style={{
                                            padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0',
                                            backgroundColor: '#f0fdf4', color: '#166534', fontWeight: '600', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <CheckCircle2 size={18} /> Hire
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusUpdate('REJECTED')}
                                        disabled={statusUpdating}
                                        style={{
                                            padding: '12px', borderRadius: '8px', border: '1px solid #fecaca',
                                            backgroundColor: '#fef2f2', color: '#991b1b', fontWeight: '600', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <XCircle size={18} /> Reject
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Social links from candidate profile (User.linkedin / github / twitter) */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#111827' }}>Social Links</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {(() => {
                                const li = resolveSocialUrl(candidate?.linkedin, 'linkedin');
                                const gh = resolveSocialUrl(candidate?.github, 'github');
                                const tw = resolveSocialUrl(candidate?.twitter, 'twitter');
                                const rowStyle: CSSProperties = {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#f9fafb',
                                    textDecoration: 'none',
                                    color: '#4b5563',
                                };
                                const muted = { ...rowStyle, cursor: 'default', opacity: 0.75 };
                                return (
                                    <>
                                        {li && isSafeUrl(li) ? (
                                            <a
                                                href={li}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={rowStyle}
                                                className="hover:bg-gray-100 transition-colors"
                                            >
                                                <Linkedin size={20} color="#0077b5" />
                                                <span style={{ fontSize: '14px', fontWeight: '500' }}>LinkedIn Profile</span>
                                                <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                            </a>
                                        ) : (
                                            <div style={muted}>
                                                <Linkedin size={20} color="#0077b5" />
                                                <span style={{ fontSize: '14px', fontWeight: '500' }}>LinkedIn Profile</span>
                                                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>Not provided</span>
                                            </div>
                                        )}
                                        {gh && isSafeUrl(gh) ? (
                                            <a
                                                href={gh}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={rowStyle}
                                                className="hover:bg-gray-100 transition-colors"
                                            >
                                                <Github size={20} color="#333" />
                                                <span style={{ fontSize: '14px', fontWeight: '500' }}>GitHub Profile</span>
                                                <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                            </a>
                                        ) : (
                                            <div style={muted}>
                                                <Github size={20} color="#333" />
                                                <span style={{ fontSize: '14px', fontWeight: '500' }}>GitHub Profile</span>
                                                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>Not provided</span>
                                            </div>
                                        )}
                                        {tw && isSafeUrl(tw) ? (
                                            <a
                                                href={tw}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={rowStyle}
                                                className="hover:bg-gray-100 transition-colors"
                                            >
                                                <Twitter size={20} color="#0ea5e9" />
                                                <span style={{ fontSize: '14px', fontWeight: '500' }}>X / Twitter</span>
                                                <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                            </a>
                                        ) : (
                                            <div style={muted}>
                                                <Twitter size={20} color="#0ea5e9" />
                                                <span style={{ fontSize: '14px', fontWeight: '500' }}>X / Twitter</span>
                                                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>Not provided</span>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
