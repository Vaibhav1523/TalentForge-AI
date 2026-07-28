'use client';

import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Users,
    Briefcase,
    MousePointer2,
    Eye,
    Calendar,
    ChevronDown,
    ArrowUpRight,
    SearchX
} from 'lucide-react';

export default function CompanyAnalyticsPage() {
    return (
        <div className="dashboard-page-content">
            {/* Header */}
            <header className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Hiring Analytics</h1>
                    <p className="page-subtitle">Track your recruitment performance and candidate engagement.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn-secondary" style={{ display: 'flex', gap: '8px' }}>
                        <Calendar size={18} />
                        Last 30 Days
                        <ChevronDown size={16} />
                    </button>
                    <button type="button" className="btn-primary">Export Report</button>
                </div>
            </header>

            {/* Performance Overview */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon blue" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                            <Eye size={20} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            +12% <TrendingUp size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">12.5k</span>
                        <span className="stat-label">Job Views</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon purple" style={{ backgroundColor: '#f5f3ff', color: '#8b5cf6' }}>
                            <MousePointer2 size={20} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            +5.4% <TrendingUp size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">842</span>
                        <span className="stat-label">Applications</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon orange" style={{ backgroundColor: '#fff7ed', color: '#f97316' }}>
                            <Users size={20} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            +18% <TrendingUp size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">6.8%</span>
                        <span className="stat-label">Conv. Rate</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon green" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
                            <TrendingDown size={20} />
                        </div>
                        {/* Negative delta for time-to-hire is an improvement (green), positive would be bad (red) */}
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            -2.1% <TrendingDown size={14} />
                        </span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">18 days</span>
                        <span className="stat-label">Avg. Time to Hire</span>
                    </div>
                </div>
            </div>

            {/* Placeholder for Charts */}
            <div className="dashboard-content-grid">
                <div className="activity-section" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fcfdfe' }}>
                    <div style={{ textAlign: 'center' }}>
                        <BarChart3 size={64} strokeWidth={1} style={{ color: '#e5e7eb', marginBottom: '20px' }} />
                        <p style={{ color: '#9ca3af', fontWeight: '500' }}>Application trends chart will be displayed here</p>
                    </div>
                </div>

                <div className="dashboard-sidebar-col">
                    <div className="sidebar-widget">
                        <h3 className="widget-header">Top Active Roles</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#4b5563' }}>Frontend Engineer</span>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>342 views</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#4b5563' }}>Product Designer</span>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>215 views</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
