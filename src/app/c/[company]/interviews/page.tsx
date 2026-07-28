'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRecruiterBasePath } from '@/components/RecruiterBasePathContext';
import {
    Video,
    Calendar,
    Clock,
    User,
    MoreVertical,
    Search,
    ChevronRight,
    MapPin,
    ExternalLink,
    VideoOff
} from 'lucide-react';

type InterviewListItem = {
    id: string;
    candidateName: string;
    jobTitle: string;
    date: string;
    time: string;
    type: string;
    status: string;
    isScheduled: boolean;
};

function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${m}/${d}/${y}`;
}

function formatTime(date: Date): string {
    const h = date.getHours();
    const min = String(date.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${min} ${ampm}`;
}

export default function CompanyInterviewsPage() {
    const base = useRecruiterBasePath();
    const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const slug = base.split("/").filter(Boolean).pop() || "";

        const fetchInterviews = async () => {
            try {
                const res = await fetch(`/api/company/applications?slug=${encodeURIComponent(slug)}`, { signal: controller.signal });
                if (!res.ok) {
                    const msg = `Failed to load interviews (${res.status})`;
                    setFetchError(msg);
                    setInterviews([]);
                    return;
                }
                const raw = await res.json();
                const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
                type AppItem = { id: string; status: string; candidate?: { name?: string }; job?: { title?: string }; updatedAt: string; interviewScheduledAt?: string | null };
                const interviewApps = data.filter((app: AppItem) =>
                    ['Interview', 'INTERVIEW', 'Shortlisted', 'SHORTLISTED'].includes(app.status)
                );

                const mappedInterviews: InterviewListItem[] = interviewApps.map((app: AppItem) => {
                    const scheduledRaw = app.interviewScheduledAt ? new Date(app.interviewScheduledAt) : null;
                    const scheduledAt = scheduledRaw && !isNaN(scheduledRaw.getTime()) ? scheduledRaw : null;
                    const updatedRaw = new Date(app.updatedAt);
                    const updatedAt = !isNaN(updatedRaw.getTime()) ? updatedRaw : null;
                    const displayDate = scheduledAt
                        ? formatDate(scheduledAt)
                        : updatedAt
                            ? `Last updated ${formatDate(updatedAt)}`
                            : 'Unknown date';
                    const displayTime = scheduledAt
                        ? formatTime(scheduledAt)
                        : updatedAt
                            ? formatTime(updatedAt)
                            : 'Unknown time';
                    return {
                        id: app.id,
                        candidateName: app.candidate?.name || 'Unknown Candidate',
                        jobTitle: app.job?.title || 'Unknown Job',
                        date: displayDate,
                        time: displayTime,
                        type: 'Video',
                        status: app.status,
                        isScheduled: !!scheduledAt
                    };
                });
                setInterviews(mappedInterviews);
            } catch (error) {
                if (controller.signal.aborted) return;
                console.error("Failed to fetch interviews", error);
                setFetchError('Failed to load interviews. Please try again.');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        fetchInterviews();
        return () => controller.abort();
    }, []);

    if (loading) {
        return <div className="p-12 text-center">Loading interviews...</div>;
    }

    if (fetchError) {
        return <div className="p-12 text-center" style={{ color: '#dc2626' }}>{fetchError}</div>;
    }

    return (
        <div className="dashboard-page-content">
            {/* Header */}
            <header className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Interviews Schedule</h1>
                    <p className="page-subtitle">View and manage your upcoming candidate evaluations.</p>
                </div>
                <Link href={`${base}/interviews/schedule`} className="btn-primary" style={{ display: 'flex', gap: '8px', textDecoration: 'none', alignItems: 'center' }}>
                    <Calendar size={18} />
                    Schedule Interview
                </Link>
            </header>

            {/* Main Content Grid */}
            <div className="dashboard-content-grid">
                <div className="activity-section">
                    <div className="activity-header">
                        <h3 className="section-heading-text">Upcoming Interviews</h3>
                    </div>

                    <div className="activity-list">
                        {interviews.length > 0 ? (
                            interviews.map((interview) => (
                                <div key={interview.id} className="activity-item" style={{ alignItems: 'center' }}>
                                    <div className="activity-avatar" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                                        {interview.type === 'Video' ? <Video size={20} /> : <User size={20} />}
                                    </div>
                                    <div className="activity-content" style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <p style={{ margin: 0 }}><strong>{interview.candidateName}</strong> for <strong>{interview.jobTitle}</strong></p>
                                                <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Calendar size={12} /> {interview.date}
                                                    </span>
                                                    <span style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} /> {interview.time} {interview.isScheduled ? '(Scheduled)' : '(Last Update)'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    backgroundColor: '#ecfdf5',
                                                    color: '#10b981'
                                                }}>
                                                    {interview.status}
                                                </span>
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label="Join Meeting — Meeting link not available yet"
                                                    style={{ display: 'inline-flex' }}
                                                >
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        style={{ padding: '8px 12px', height: 'auto', fontSize: '12px', display: 'flex', gap: '6px', pointerEvents: 'none' }}
                                                        disabled
                                                        aria-hidden="true"
                                                        tabIndex={-1}
                                                    >
                                                        Join Meeting <ExternalLink size={14} />
                                                    </button>
                                                </span>
                                                {/* TODO: wire openOptionsMenu handler for per-interview actions */}
                                                <button type="button" disabled aria-disabled="true" title="More options coming soon" style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'not-allowed' }}>
                                                    <MoreVertical size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                                <VideoOff size={40} strokeWidth={1.5} style={{ color: '#9ca3af', marginBottom: '16px' }} />
                                <p style={{ color: '#6b7280' }}>No interviews scheduled.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="dashboard-sidebar-col">
                    <div className="sidebar-widget">
                        <h3 className="widget-header">Interview Stats</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', color: '#6b7280' }}>Total Candidates</span>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>{interviews.length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', color: '#6b7280' }}>Confirmed</span>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>{interviews.filter(i => i.status === 'INTERVIEW' || i.status === 'Interview').length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
