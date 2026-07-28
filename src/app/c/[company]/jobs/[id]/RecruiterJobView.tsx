'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useRecruiterBasePath } from '@/components/RecruiterBasePathContext';
import { useDashboardTheme } from '@/components/dashboard/DashboardThemeProvider';
import { isHtmlString, sanitizeHtml } from '@/lib/htmlUtils';
import {
    ArrowLeft,
    Pencil,
    Trash2,
    MapPin,
    Briefcase,
    DollarSign,
    Calendar,
    CheckCircle2,
    Building2,
    Users,
    Loader2,
    AlertCircle,
    LayoutDashboard
} from 'lucide-react';

export default function RecruiterJobView({ params }: { params: { id: string } }) {
    const router = useRouter();
    const base = useRecruiterBasePath();
    const { theme } = useDashboardTheme();
    const isDark = theme === 'dark';
    const headingTextColor = isDark ? '#e8f7fd' : '#111827';
    const bodyTextColor = isDark ? '#c7dfeb' : '#4b5563';
    const mutedTextColor = isDark ? '#95b8c8' : '#6b7280';
    const faintTextColor = isDark ? '#8fb4c4' : '#9ca3af';
    const dividerColor = isDark
        ? '1px solid rgba(101, 177, 208, 0.28)'
        : '1px solid #f3f4f6';
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notFoundError, setNotFoundError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchJob = async () => {
            try {
                const res = await fetch(`/api/company/jobs/${params.id}`, { signal: controller.signal });

                if (!res.ok) {
                    if (res.status === 404) {
                        if (!controller.signal.aborted) setNotFoundError(true);
                        return;
                    }
                    throw new Error(`Failed to fetch job (${res.status})`);
                }

                const data = await res.json();
                if (!controller.signal.aborted) {
                    setJob(data);
                    setError(null);
                }
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error(err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        fetchJob();
        return () => controller.abort();
    }, [params.id]);

    // Add Escape key listener for modal
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsDeleteModalOpen(false);
        };
        if (isDeleteModalOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isDeleteModalOpen]);

    useEffect(() => {
        if (!isDeleteModalOpen) return;

        const modal = modalRef.current;
        if (!modal) return;

        const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelector);
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        firstFocusable?.focus();

        const handleTabTrap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable?.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable?.focus();
                }
            }
        };

        document.addEventListener('keydown', handleTabTrap);
        return () => document.removeEventListener('keydown', handleTabTrap);
    }, [isDeleteModalOpen]);

    const handleDelete = async () => {
        setIsDeleting(true);
        setIsDeleteModalOpen(false);
        try {
            const res = await fetch(`/api/company/jobs/${job.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Job deleted successfully');
                router.push(`${base}/jobs`);
            } else {
                let errorMessage = 'Failed to delete job';
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonErr) {
                    errorMessage = `${res.statusText || 'Server Error'} (${res.status})`;
                }
                toast.error(errorMessage);
            }
        } catch (err: unknown) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Error deleting job');
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusStyle = (status: string) => {
        const s = status || 'DRAFT';
        const baseStyle = {
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'capitalize' as const,
            display: 'inline-block'
        };

        switch (s) {
            case 'ACTIVE':
                return { ...baseStyle, backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
            case 'DRAFT':
                return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
            case 'CLOSED':
            case 'ARCHIVED':
                return { ...baseStyle, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
            default:
                return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );

    if (error) return <div style={{ padding: '32px', textAlign: 'center', color: '#dc2626' }}>Unable to load job: {error.message}</div>;

    if (notFoundError || !job) return <div style={{ padding: '32px', textAlign: 'center' }}>Job not found</div>;

    const statusStyle = getStatusStyle(job.status);
    const postedDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A';

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
            {/* Top Navigation */}
            <Link
                href={`${base}/jobs`}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    color: mutedTextColor, textDecoration: 'none', marginBottom: '24px',
                    fontSize: '14px', fontWeight: '500'
                }}
            >
                <ArrowLeft size={18} /> Back to Jobs
            </Link>

            {/* Header Card */}
            <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Top Row: Status + Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <span style={statusStyle}>{job.status?.toLowerCase() || 'draft'}</span>
                        <span style={{ color: mutedTextColor, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} /> Posted on {postedDate}
                        </span>
                    </div>

                    {/* Title */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: headingTextColor, lineHeight: '1.2' }}>{job.title}</h1>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Link
                                href={`${base}/jobs/${job.id}/edit`}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                                    borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500',
                                    backgroundColor: isDark ? 'rgba(8, 31, 43, 0.88)' : '#ffffff',
                                    color: isDark ? '#b9e8f6' : '#374151',
                                    border: isDark ? '1px solid rgba(101, 177, 208, 0.34)' : '1px solid #d1d5db'
                                }}
                            >
                                <Pencil size={16} /> Edit Job
                            </Link>
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(true)}
                                disabled={isDeleting}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                                    borderRadius: '8px', fontSize: '14px', fontWeight: '500',
                                    backgroundColor: isDark ? 'rgba(92, 25, 34, 0.9)' : '#ffffff',
                                    color: isDark ? '#ffd8de' : '#dc2626',
                                    border: isDark ? '1px solid rgba(248, 113, 113, 0.56)' : '1px solid #fee2e2',
                                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                                    opacity: isDeleting ? 0.6 : 1
                                }}
                            >
                                <Trash2 size={16} /> {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: bodyTextColor, fontSize: '15px' }}>
                            <Building2 size={18} style={{ color: faintTextColor }} />
                            <span style={{ fontWeight: '500' }}>{job.company || 'Your Company'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: bodyTextColor, fontSize: '15px' }}>
                            <MapPin size={18} style={{ color: faintTextColor }} />
                            <span>{job.location ?? 'Location not specified'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: bodyTextColor, fontSize: '15px' }}>
                            <Briefcase size={18} style={{ color: faintTextColor }} />
                            <span>{job.employmentType ?? 'Employment type not specified'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: bodyTextColor, fontSize: '15px' }}>
                            <DollarSign size={18} style={{ color: faintTextColor }} />
                            <span>{job.salary ? (job.currency ? `${job.salary} ${job.currency}` : `${job.salary}`) : 'Not specified'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>

                {/* Left Column: Description & Skills */}
                <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Description */}
                    <div className="card" style={{ padding: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: headingTextColor, marginBottom: '16px' }}>Job Description</h2>
                        {(() => {
                            if (job.description == null) return null;
                            const sanitized = sanitizeHtml(job.description);
                            return isHtmlString(job.description) && sanitized.includes('<') ? (
                                <div
                                    className="rich-preview"
                                    style={{ color: bodyTextColor, lineHeight: '1.7', fontSize: '15px' }}
                                    dangerouslySetInnerHTML={{ __html: sanitized }}
                                />
                            ) : (
                                <div style={{ color: bodyTextColor, lineHeight: '1.7', whiteSpace: 'pre-wrap', fontSize: '15px' }}>
                                    {job.description}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Skills */}
                    <div className="card" style={{ padding: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: headingTextColor, marginBottom: '16px' }}>Skills & Requirements</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {job.skills && job.skills.length > 0 ? (
                                job.skills.map((skill: string, index: number) => (
                                    <span
                                        key={index}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            padding: '6px 14px', borderRadius: '999px', fontSize: '14px', fontWeight: '500',
                                            backgroundColor: '#eff6ff', color: '#2563eb'
                                        }}
                                    >
                                        <CheckCircle2 size={14} style={{ opacity: 0.7 }} />
                                        {skill}
                                    </span>
                                ))
                            ) : (
                                <p style={{ color: faintTextColor, fontStyle: 'italic' }}>No specific skills listed.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Key Details & Applicants */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Applicants Card */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: headingTextColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={18} style={{ color: '#3b82f6' }} />
                            Applicants
                        </h3>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ color: mutedTextColor, fontSize: '14px' }}>Total Applied</span>
                                <span style={{ fontSize: '24px', fontWeight: '700', color: headingTextColor }}>{job._count?.applications || 0}</span>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: faintTextColor }}>Candidate pipeline size.</p>
                        </div>
                        <Link
                            href={`${base}/candidates?jobId=${job.id}`}
                            style={{
                                display: 'block', width: '100%', textAlign: 'center', padding: '12px',
                                backgroundColor: '#2563eb', color: 'white', borderRadius: '8px',
                                textDecoration: 'none', fontWeight: '600', fontSize: '14px'
                            }}
                        >
                            View Candidates
                        </Link>
                    </div>

                    {/* Job Details Sidebar */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: headingTextColor }}>Job Overview</h3>
                        <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '14px' }}>
                            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: dividerColor }}>
                                <span style={{ color: mutedTextColor }}>Category</span>
                                <span style={{ fontWeight: '500', color: headingTextColor }}>{job.category || 'N/A'}</span>
                            </li>
                            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: dividerColor }}>
                                <span style={{ color: mutedTextColor }}>Employment</span>
                                <span style={{ fontWeight: '500', color: headingTextColor }}>{job.employmentType ?? 'Employment type not specified'}</span>
                            </li>
                            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: dividerColor }}>
                                <span style={{ color: mutedTextColor }}>Posted Date</span>
                                <span style={{ fontWeight: '500', color: headingTextColor }}>{postedDate}</span>
                            </li>
                            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', paddingTop: '16px' }}>
                                <span style={{ color: mutedTextColor }}>Status</span>
                                <span style={{ fontWeight: '600', textTransform: 'capitalize', color: statusStyle.color }}>{(job.status ?? 'draft').toLowerCase()}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsDeleteModalOpen(false);
                    }}
                    style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', cursor: 'pointer' }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-job-title"
                >
                    <div ref={modalRef} className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px', cursor: 'default' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h3 id="delete-job-title" style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700', color: headingTextColor }}>Delete Job Post?</h3>
                                <p style={{ margin: 0, fontSize: '14px', color: mutedTextColor }}>This action cannot be undone.</p>
                            </div>
                        </div>

                        <p style={{ margin: '0 0 24px', color: bodyTextColor, lineHeight: '1.5', fontSize: '15px' }}>
                            Are you sure you want to delete this job? All associated applications will also be permanently removed.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                style={{
                                    padding: '10px 20px', borderRadius: '8px',
                                    backgroundColor: isDark ? 'rgba(8, 31, 43, 0.88)' : '#ffffff',
                                    color: isDark ? '#b9e8f6' : '#374151',
                                    border: isDark ? '1px solid rgba(101, 177, 208, 0.34)' : '1px solid #d1d5db',
                                    fontSize: '14px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                style={{
                                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                                    backgroundColor: '#dc2626', color: '#ffffff', fontSize: '14px', fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
