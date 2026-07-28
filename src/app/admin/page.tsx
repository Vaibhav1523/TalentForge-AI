import Link from "next/link";
import { getAdminDashboardData, type AdminDashboardLead } from "@/lib/admin/admin-data";
import { AdminLeadOverviewRow } from "@/components/admin/AdminLeadOverviewRow";

function fmt(d: Date | null) {
    if (!d) return "N/A";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

function ago(d: Date | null) {
    if (!d) return "";
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const dy = Math.floor(h / 24);
    if (dy < 7) return `${dy}d ago`;
    return fmt(d);
}

function statusBadge(s: string) {
    if (s === "ACTIVE" || s === "HIRED" || s === "SHORTLISTED") return "badge status-active";
    if (s === "DRAFT" || s === "APPLIED" || s === "INTERVIEW") return "badge status-draft";
    if (s === "REJECTED") return "badge status-rejected";
    return "badge status-other";
}

function jobUrl(slug: string | null, id: string) {
    return slug ? `/jobs/${slug}/${id}` : `/jobs/${id}`;
}

function pct(n: number, total: number) {
    if (!total) return 0;
    return Math.round((n / total) * 100);
}

export default async function AdminOverviewPage() {
    let data: Awaited<ReturnType<typeof getAdminDashboardData>> | null = null;
    let err = "";
    try {
        data = await getAdminDashboardData();
    } catch {
        err = "Failed to connect to the database.";
    }

    const s = data?.stats ?? {
        totalUsers: 0, totalCandidates: 0, totalRecruiters: 0,
        recruitersWithPosts: 0, totalJobs: 0, activeJobs: 0, totalApplications: 0,
        totalLeads: 0, newLeadsLast7Days: 0, leadsWithUpcomingMeet: 0,
    };

    const leads: AdminDashboardLead[] = data?.leads ?? [];
    const apps = data?.applications ?? [];
    const jobs = data?.jobs ?? [];
    const users = data?.users ?? [];

    const pipeline = {
        applied: apps.filter((a) => a.status === "APPLIED").length,
        shortlisted: apps.filter((a) => a.status === "SHORTLISTED").length,
        interview: apps.filter((a) => a.status === "INTERVIEW").length,
        hired: apps.filter((a) => a.status === "HIRED").length,
        rejected: apps.filter((a) => a.status === "REJECTED").length,
    };
    const pipelineMax = Math.max(pipeline.applied, pipeline.shortlisted, pipeline.interview, pipeline.hired, pipeline.rejected, 1);

    const avgAppsPerJob = s.totalJobs ? (s.totalApplications / s.totalJobs).toFixed(1) : "0";
    const conversionRate = s.totalApplications ? pct(pipeline.hired, s.totalApplications) : 0;

    const topJobs = [...jobs]
        .sort((a, b) => b.applicationCount - a.applicationCount)
        .slice(0, 5);
    const topJobMax = topJobs[0]?.applicationCount || 1;

    const recentApps = apps.slice(0, 8);
    const recentCandidates = users.filter((u) => u.userRole === "CANDIDATE").slice(0, 5);

    const now = new Date();
    const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

    return (
        <div className="page-shell">
            <div className="page-wrap">
                {/* Header */}
                <section className="header-card">
                    <h1 className="header-title">{greeting}</h1>
                    <p className="header-subtitle">
                        {fmt(now)} &mdash; Here&apos;s what&apos;s happening on your platform
                    </p>
                </section>

                {err && <div className="empty-state">{err}</div>}

                {/* Key metrics */}
                <section className="stats-grid">
                    <Link href="/admin/users" className="stat-card stat-card-link">
                        <div className="stat-label">Candidates</div>
                        <div className="stat-value">{s.totalCandidates}</div>
                        <div className="stat-sub">{s.totalUsers} total users</div>
                    </Link>
                    <Link href="/admin/recruiters" className="stat-card stat-card-link">
                        <div className="stat-label">Recruiters</div>
                        <div className="stat-value">{s.totalRecruiters}</div>
                        <div className="stat-sub">{s.recruitersWithPosts} actively hiring</div>
                    </Link>
                    <Link href="/admin/jobs" className="stat-card stat-card-link">
                        <div className="stat-label">Active Jobs</div>
                        <div className="stat-value">{s.activeJobs}</div>
                        <div className="stat-sub">{s.totalJobs} total posted</div>
                    </Link>
                    <Link href="/admin/applications" className="stat-card stat-card-link">
                        <div className="stat-label">Applications</div>
                        <div className="stat-value">{s.totalApplications}</div>
                        <div className="stat-sub">{avgAppsPerJob} avg per job</div>
                    </Link>
                    <Link href="/admin/leads" className="stat-card stat-card-link">
                        <div className="stat-label">Leads</div>
                        <div className="stat-value">{s.totalLeads}</div>
                        <div className="stat-sub">
                            {s.newLeadsLast7Days} new (7d)
                            {s.leadsWithUpcomingMeet > 0
                                ? ` · ${s.leadsWithUpcomingMeet} upcoming meet${s.leadsWithUpcomingMeet === 1 ? "" : "s"}`
                                : ""}
                        </div>
                    </Link>
                </section>

                {/* Leads: form captures + Cal meet times */}
                <section className="panel" style={{ marginBottom: 20 }}>
                    <div className="toolbar">
                        <div className="row-title">Leads &amp; intro calls</div>
                        <Link href="/admin/leads" className="btn">All leads →</Link>
                    </div>
                    <p className="header-subtitle" style={{ fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
                        <strong>New</strong> = created in the last 7 days and not yet opened on this device.&nbsp;
                        <strong>Meet</strong> = next confirmed Cal slot (date + time); otherwise last call or no booking.
                        Click a row to open the full list and clear the New badge.
                    </p>
                    {leads.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            No leads captured yet
                        </div>
                    ) : (
                        <div className="list">
                            {leads.map((L) => (
                                <AdminLeadOverviewRow
                                    key={L.id}
                                    lead={{
                                        id: L.id,
                                        name: L.name,
                                        email: L.email,
                                        company: L.company,
                                        meetKind: L.meetKind,
                                        isNew: L.isNew,
                                        meetAtIso: L.meetAt?.toISOString() ?? null,
                                        createdRelative: ago(L.createdAt),
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Pipeline + Activity */}
                <div className="overview-grid">
                    {/* Hiring Pipeline */}
                    <section className="panel">
                        <div className="toolbar">
                            <div className="row-title">Hiring Pipeline</div>
                            {conversionRate > 0 && (
                                <span className="badge status-active no-dot" style={{ fontSize: 11 }}>
                                    {conversionRate}% hire rate
                                </span>
                            )}
                        </div>

                        <div className="pipeline-bar">
                            <div className="pipeline-label">Applied</div>
                            <div className="pipeline-track"><div className="pipeline-fill fill-applied" style={{ width: `${pct(pipeline.applied, pipelineMax)}%` }} /></div>
                            <div className="pipeline-count">{pipeline.applied}</div>
                        </div>
                        <div className="pipeline-bar">
                            <div className="pipeline-label">Shortlisted</div>
                            <div className="pipeline-track"><div className="pipeline-fill fill-shortlisted" style={{ width: `${pct(pipeline.shortlisted, pipelineMax)}%` }} /></div>
                            <div className="pipeline-count">{pipeline.shortlisted}</div>
                        </div>
                        <div className="pipeline-bar">
                            <div className="pipeline-label">Interview</div>
                            <div className="pipeline-track"><div className="pipeline-fill fill-interview" style={{ width: `${pct(pipeline.interview, pipelineMax)}%` }} /></div>
                            <div className="pipeline-count">{pipeline.interview}</div>
                        </div>
                        <div className="pipeline-bar">
                            <div className="pipeline-label">Hired</div>
                            <div className="pipeline-track"><div className="pipeline-fill fill-hired" style={{ width: `${pct(pipeline.hired, pipelineMax)}%` }} /></div>
                            <div className="pipeline-count">{pipeline.hired}</div>
                        </div>
                        <div className="pipeline-bar">
                            <div className="pipeline-label">Rejected</div>
                            <div className="pipeline-track"><div className="pipeline-fill fill-rejected" style={{ width: `${pct(pipeline.rejected, pipelineMax)}%` }} /></div>
                            <div className="pipeline-count">{pipeline.rejected}</div>
                        </div>

                        {/* Quick metrics below pipeline */}
                        <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 14 }}>
                            <div className="metric-row">
                                <span className="metric-label">Avg. applications per job</span>
                                <span className="metric-value">{avgAppsPerJob}</span>
                            </div>
                            <div className="metric-row">
                                <span className="metric-label">Conversion rate</span>
                                <span className="metric-value">{conversionRate}%</span>
                            </div>
                            <div className="metric-row">
                                <span className="metric-label">Active pipeline</span>
                                <span className="metric-value">{pipeline.shortlisted + pipeline.interview}</span>
                            </div>
                        </div>
                    </section>

                    {/* Recent Activity */}
                    <section className="panel">
                        <div className="toolbar">
                            <div className="row-title">Recent Activity</div>
                            <Link href="/admin/applications" className="btn">All Applications →</Link>
                        </div>
                        {recentApps.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📭</div>
                                No applications yet
                            </div>
                        ) : (
                            <div>
                                {recentApps.map((a, i) => (
                                    <div key={a.id} className="activity-item">
                                        <div className="activity-dot-col">
                                            <div className={`activity-dot ${a.status === "HIRED" ? "dot-green" : a.status === "INTERVIEW" ? "dot-purple" : a.status === "REJECTED" ? "" : "dot-amber"}`}
                                                 style={a.status === "REJECTED" ? { background: "var(--red)" } : undefined} />
                                            {i < recentApps.length - 1 && <div className="activity-line" />}
                                        </div>
                                        <div className="activity-body">
                                            <div className="activity-text">
                                                <Link href={`/admin/users/${a.candidateId}`} className="name-link" style={{ fontWeight: 700 }}>{a.candidateName}</Link>
                                                {" applied to "}
                                                <Link href={jobUrl(a.companySlug, a.jobId)} className="name-link" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>{a.jobTitle}</Link>
                                                {a.company && <span style={{ color: "var(--muted)" }}> at {a.company}</span>}
                                            </div>
                                            <div className="activity-time">{ago(a.appliedAt)}</div>
                                        </div>
                                        <span className={statusBadge(a.status)} style={{ alignSelf: "center", flexShrink: 0 }}>{a.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Top Jobs + New Candidates */}
                <div className="overview-grid">
                    {/* Top performing jobs */}
                    <section className="panel">
                        <div className="toolbar">
                            <div className="row-title">Top Jobs by Applicants</div>
                            <Link href="/admin/jobs" className="btn">All Jobs →</Link>
                        </div>
                        {topJobs.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">💼</div>
                                No jobs posted yet
                            </div>
                        ) : (
                            <div>
                                {topJobs.map((j, i) => (
                                    <div key={j.id} className="leaderboard-row">
                                        <div className="leaderboard-rank">{i + 1}</div>
                                        <div className="leaderboard-info">
                                            <div className="leaderboard-name">
                                                <Link href={jobUrl(j.companySlug, j.id)} className="name-link" target="_blank" rel="noopener noreferrer">{j.title}</Link>
                                            </div>
                                            <div className="leaderboard-sub">{j.company} &middot; {j.location}</div>
                                        </div>
                                        <div className="count-bar-cell">
                                            <div className="count-bar">
                                                <div className="count-bar-fill" style={{ width: `${pct(j.applicationCount, topJobMax)}%` }} />
                                            </div>
                                            <span className="leaderboard-count">{j.applicationCount}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* New Candidates */}
                    <section className="panel">
                        <div className="toolbar">
                            <div className="row-title">New Candidates</div>
                            <Link href="/admin/users" className="btn">All Users →</Link>
                        </div>
                        {recentCandidates.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">👤</div>
                                No candidates yet
                            </div>
                        ) : (
                            <div className="list">
                                {recentCandidates.map((u) => (
                                    <div key={u.id} className="overview-row">
                                        <div className="user-cell" style={{ flex: 1, minWidth: 0 }}>
                                            <div className="avatar-sm purple">
                                                {(u.name ?? '').split(' ').filter(Boolean).map((w) => w.charAt(0)).join('').toUpperCase().slice(0, 2) || '?'}
                                            </div>
                                            <div className="user-cell-info">
                                                <Link href={`/admin/users/${u.id}`} className="name-link" style={{ fontWeight: 700, fontSize: 13 }}>{u.name ?? 'Unknown User'}</Link>
                                                <div className="row-sub">{u.email}</div>
                                            </div>
                                        </div>
                                        <div className="overview-row-badge">
                                            {u.applicationCount > 0 && (
                                                <span className="badge role-candidate no-dot" style={{ fontSize: 10 }}>{u.applicationCount} apps</span>
                                            )}
                                            <div className="row-sub" style={{ marginTop: 3 }}>{ago(u.createdAt)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
