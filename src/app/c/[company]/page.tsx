'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Briefcase, Users, Clock, FileText, Loader2 } from 'lucide-react';
import { useRecruiterBasePath } from '@/components/RecruiterBasePathContext';

type RecentActivityItem = { id: string; type: string; user: string; role: string; time: string };

function getActivityText(type: string): string {
    switch (type) {
        case 'applied': return 'applied for';
        case 'interviewed': return 'was interviewed for';
        case 'hired': return 'was hired for';
        case 'rejected': return 'was rejected from';
        case 'withdrawn': return 'withdrew from';
        default: return 'applied for';
    }
}

export default function CompanyDashboardPage() {
    const base = useRecruiterBasePath();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        activeJobs: 0,
        totalCandidates: 0,
        totalApplications: 0,
        interviews: 0,
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const slug = base.split("/").pop() || "";
                const res = await fetch(`/api/company/dashboard-stats?slug=${encodeURIComponent(slug)}`);
                if (!res.ok) throw new Error('Failed to fetch dashboard stats');
                const data = await res.json();
                setStats(prev => ({
                    activeJobs: data.stats?.activeJobs ?? prev.activeJobs,
                    totalCandidates: data.stats?.totalCandidates ?? prev.totalCandidates,
                    totalApplications: data.stats?.totalApplications ?? prev.totalApplications,
                    interviews: data.stats?.interviews ?? prev.interviews,
                }));
                setRecentActivity(Array.isArray(data.recentActivity) ? data.recentActivity : []);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
                setFetchError('Failed to load dashboard data. Please refresh the page.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: '#ef4444' }}>
                <p style={{ fontSize: '16px', fontWeight: 600 }}>{fetchError}</p>
            </div>
        );
    }

    return (
        <div className="dashboard-page-content">
            <header className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Company Dashboard</h1>
                    <p className="page-subtitle">Welcome back! Here&apos;s what&apos;s happening today.</p>
                </div>
                <Link href={`${base}/jobs/new`} className="btn-primary">
                    <Plus size={18} />
                    Post a New Job
                </Link>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon blue"><Briefcase size={22} /></div>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.activeJobs}</span>
                        <span className="stat-label">Active Jobs</span>
                    </div>
                    <div className="stat-footer">
                        <Link href={`${base}/jobs`} className="stat-link">View Jobs</Link>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon purple"><Users size={22} /></div>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalCandidates}</span>
                        <span className="stat-label">Total Candidates</span>
                    </div>
                    <div className="stat-footer">
                        <Link href={`${base}/candidates`} className="stat-link">View Talent</Link>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon blue"><FileText size={22} /></div>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalApplications}</span>
                        <span className="stat-label">Applications</span>
                    </div>
                    <div className="stat-footer">
                        <Link href={`${base}/candidates`} className="stat-link">Review All</Link>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon orange"><Clock size={22} /></div>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.interviews}</span>
                        <span className="stat-label">Interviews</span>
                    </div>
                    <div className="stat-footer">
                        <Link href={`${base}/interviews`} className="stat-link">View Schedule</Link>
                    </div>
                </div>
            </div>

            <div className="dashboard-content-grid">
                <div className="activity-section">
                    <div className="activity-header">
                        <h3 className="section-heading-text">Recent Activity</h3>
                    </div>
                    <div className="activity-list">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((item) => (
                                <div key={item.id} className="activity-item">
                                    <div className="activity-avatar"><Users size={20} /></div>
                                    <div className="activity-content">
                                        <p><strong>{item.user}</strong> {getActivityText(item.type)} <strong>{item.role}</strong></p>
                                        <span className="activity-time">{item.time}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="company-activity-empty" style={{ padding: '24px', fontSize: '14px' }}>
                                No recent activity
                            </div>
                        )}
                    </div>
                </div>

                <div className="dashboard-sidebar-col">
                    <div className="sidebar-widget promo-widget">
                        <h3 className="promo-title">Boost your reach</h3>
                        <p className="promo-desc">Get 3x more applicants by promoting your open roles to featured listings.</p>
                        <button type="button" className="promo-btn" onClick={() => router.push(`${base}/jobs`)}>Promote a Job</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
