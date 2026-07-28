'use client';

import { useState, useEffect } from 'react';
import {
    Briefcase, Calendar, Filter,
    CheckCircle, Clock, XCircle, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'APPLIED':
            return <span className="tag app-status-tag app-status-applied"><Clock size={14} /> <span>Applied</span></span>;
        case 'SHORTLISTED':
            return <span className="tag app-status-tag app-status-shortlisted"><UserCheck size={14} /> <span>Shortlisted</span></span>;
        case 'INTERVIEW':
            return <span className="tag app-status-tag app-status-interview"><Clock size={14} /> <span>Interview</span></span>;
        case 'REJECTED':
            return <span className="tag app-status-tag app-status-rejected"><XCircle size={14} /> <span>Rejected</span></span>;
        case 'HIRED':
            return <span className="tag app-status-tag app-status-hired"><CheckCircle size={14} /> <span>Hired</span></span>;
        case 'WITHDRAWN':
            return <span className="tag app-status-tag app-status-withdrawn"><XCircle size={14} /> <span>Withdrawn</span></span>;
        default:
            return <span className="tag app-status-tag">{status}</span>;
    }
};

export type ApplicationListItem = {
    id: string;
    jobId: string;
    jobTitle: string;
    company: string;
    appliedDate: string;
    status: string;
    experienceMin?: number | null;
    experienceMax?: number | null;
    logo: string;
};

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<ApplicationListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [filter, setFilter] = useState<'ACTIVE' | 'INACTIVE' | 'WITHDRAWN'>('ACTIVE');

    const fetchApplications = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/applications', {
                cache: 'no-store',
                credentials: 'same-origin',
            });

            const rawData = await res.json().catch(() => null);

            if (!res.ok) {
                const message = (rawData && typeof rawData === 'object' && 'error' in rawData)
                    ? String((rawData as { error?: string }).error || 'Failed to fetch applications')
                    : 'Failed to fetch applications';
                throw new Error(message);
            }

            if (!Array.isArray(rawData)) {
                throw new Error('Invalid applications response');
            }

            const data = rawData;

            type ApiApp = { id: string; jobId?: string; job?: { id?: string; title?: string; company?: string; experienceMin?: number | null; experienceMax?: number | null }; appliedAt: string; status: string };
            const mappedApps: ApplicationListItem[] = data.map((app: ApiApp) => ({
                id: app.id,
                jobId: app.jobId ?? app.job?.id ?? '',
                jobTitle: app.job?.title ?? 'Unknown Title',
                company: app.job?.company ?? 'Unknown Company',
                appliedDate: app.appliedAt,
                status: app.status,
                experienceMin: app.job?.experienceMin ?? null,
                experienceMax: app.job?.experienceMax ?? null,
                logo: (app.job?.company ?? '').substring(0, 2).toUpperCase()
            }));

            setApplications(mappedApps);
            setError('');

            const activeCount = mappedApps.filter(app => !['REJECTED', 'WITHDRAWN'].includes(app.status?.toUpperCase())).length;
            if (activeCount === 0) {
                const inactiveCount = mappedApps.filter(app => app.status?.toUpperCase() === 'REJECTED').length;
                if (inactiveCount > 0) {
                    setFilter('INACTIVE');
                } else {
                    const withdrawnCount = mappedApps.filter(app => app.status?.toUpperCase() === 'WITHDRAWN').length;
                    if (withdrawnCount > 0) {
                        setFilter('WITHDRAWN');
                    }
                }
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const handleWithdraw = async () => {
        if (!selectedAppId) return;
        setIsWithdrawing(true);
        try {
            const res = await fetch(`/api/applications/${selectedAppId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'WITHDRAWN' })
            });

            if (res.ok) {
                setApplications(prev => prev.map(app =>
                    app.id === selectedAppId ? { ...app, status: 'WITHDRAWN' } : app
                ));
                setIsWithdrawModalOpen(false);
                toast.success('Application withdrawn successfully');
            } else {
                toast.error('Failed to withdraw application');
            }
        } catch (err) {
            console.error(err);
            toast.error('Error withdrawing application');
        } finally {
            setIsWithdrawing(false);
            setSelectedAppId(null);
        }
    };

    const filteredApplications = applications.filter(app => {
        const status = app.status?.toUpperCase();
        if (filter === 'ACTIVE') {
            return !['REJECTED', 'WITHDRAWN'].includes(status);
        }
        if (filter === 'INACTIVE') {
            return status === 'REJECTED';
        }
        if (filter === 'WITHDRAWN') {
            return status === 'WITHDRAWN';
        }
        return true;
    });

    if (loading) {
        return (
            <div className="applications-loading">
                <div className="animate-spin text-blue-500">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="applications-error">
                <p>{error}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="btn-secondary"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="applications-page-ref">
            <div className="page-header applications-header">
                <div className="applications-header-shell">
                    <div className="applications-top-row">
                        <div>
                            <h1 className="page-title">My Applications</h1>
                            <p className="page-subtitle">Track the status of your submitted job applications.</p>
                        </div>

                        {applications.length > 0 && (
                            <div className="app-filter-tabs">
                                {(() => {
                                    const counts = {
                                        ACTIVE: applications.filter(a => !['REJECTED', 'WITHDRAWN'].includes(a.status?.toUpperCase())).length,
                                        INACTIVE: applications.filter(a => a.status?.toUpperCase() === 'REJECTED').length,
                                        WITHDRAWN: applications.filter(a => a.status?.toUpperCase() === 'WITHDRAWN').length,
                                    };
                                    const labels = { ACTIVE: 'Active Jobs', INACTIVE: 'Inactive Jobs', WITHDRAWN: 'Withdrawn' };
                                    return (['ACTIVE', 'INACTIVE', 'WITHDRAWN'] as const).map((f) => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => setFilter(f)}
                                            className={`app-filter-tab ${filter === f ? 'active' : ''}`}
                                        >
                                            {labels[f]}
                                            <span className="app-filter-count">
                                                {counts[f]}
                                            </span>
                                        </button>
                                    ));
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {applications.length === 0 ? (
                <div className="card applications-empty-state">
                    <div className="applications-empty-icon">
                        <Briefcase size={32} />
                    </div>
                    <h2 className="applications-empty-title">No Applications Yet</h2>
                    <p className="applications-empty-copy">
                        You haven&apos;t applied to any jobs yet. Start exploring opportunities that match your skills!
                    </p>
                    <Link href="/dashboard/jobs" className="btn-primary">
                        Browse Available Jobs
                    </Link>
                </div>
            ) : filteredApplications.length > 0 ? (
                <div className="applications-list">
                    {filteredApplications.map((app) => (
                        <div key={app.id} className="job-card application-card-ref">
                            <div className="application-card-content">
                                <div className="application-info">
                                    <div className="application-logo">
                                        {app.company?.charAt(0) || 'C'}
                                    </div>
                                    <div>
                                        {app.jobId && app.jobId.trim() !== '' ? (
                                            <Link href={`/dashboard/jobs/${app.jobId}`} className="application-title-link">
                                                <h3 className="application-title">{app.jobTitle}</h3>
                                            </Link>
                                        ) : (
                                            <h3 className="application-title">{app.jobTitle}</h3>
                                        )}
                                        <div className="application-meta">
                                            <span className="application-meta-item"><Briefcase size={14} /> {app.company}</span>
                                            <span className="application-meta-item"><Calendar size={14} /> Applied on {new Date(app.appliedDate).toLocaleDateString()}</span>
                                            {(app.experienceMin != null || app.experienceMax != null) && (
                                                <span className="application-exp-badge">
                                                    {app.experienceMin != null && app.experienceMax != null
                                                        ? `${app.experienceMin} - ${app.experienceMax}`
                                                        : app.experienceMin != null
                                                            ? `At least ${app.experienceMin}`
                                                            : `Up to ${app.experienceMax}`} Yrs Exp
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="application-actions">
                                    {getStatusBadge(app.status)}
                                    <div className="application-action-row">
                                        {app.status !== 'WITHDRAWN' && app.status !== 'REJECTED' && app.status !== 'HIRED' && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSelectedAppId(app.id);
                                                    setIsWithdrawModalOpen(true);
                                                }}
                                                className="btn-secondary app-withdraw-btn"
                                            >
                                                Withdraw
                                            </button>
                                        )}
                                        {app.status?.toUpperCase() === 'WITHDRAWN' && app.jobId && app.jobId.trim() !== '' && (
                                            <Link
                                                href={`/dashboard/jobs/${app.jobId}/apply`}
                                                className="btn-primary app-reapply-btn"
                                            >
                                                Re-Apply
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card applications-empty-state">
                    <div className="applications-empty-icon">
                        <Filter size={32} />
                    </div>
                    <h2 className="applications-empty-title">No {filter === 'ACTIVE' ? 'Active' : filter === 'INACTIVE' ? 'Inactive' : 'Withdrawn'} Applications</h2>
                    <p className="applications-empty-copy">
                        You don&apos;t have any applications in this category.
                    </p>
                </div>
            )}

            {isWithdrawModalOpen && (
                <div className="withdraw-modal-overlay">
                    <div className="card withdraw-modal-card">
                        <div className="withdraw-modal-icon">
                            <XCircle size={32} />
                        </div>
                        <h2 className="withdraw-modal-title">Withdraw Application?</h2>
                        <p className="withdraw-modal-copy">
                            Are you sure you want to withdraw this application? This action cannot be undone.
                        </p>
                        <div className="withdraw-modal-actions">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsWithdrawModalOpen(false);
                                    setSelectedAppId(null);
                                }}
                                className="btn-secondary withdraw-cancel-btn"
                                disabled={isWithdrawing}
                            >
                                No, Keep it
                            </button>
                            <button
                                type="button"
                                onClick={handleWithdraw}
                                className="btn-primary withdraw-confirm-btn"
                                disabled={isWithdrawing}
                            >
                                {isWithdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
