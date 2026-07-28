import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUserProfileData } from "@/lib/admin/admin-data";

type Props = { params: { id: string } };

function fmt(d: Date | null) {
    if (!d) return "N/A";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function val(v?: string | null) { return v?.trim() ? v : "—"; }

function boolVal(v: boolean | null) {
    if (v === null) return "—";
    return v ? "Enabled" : "Disabled";
}

function isSafeUrl(v?: string | null) {
    if (!v) return false;
    try { const p = new URL(v); return p.protocol === "http:" || p.protocol === "https:"; } catch { return false; }
}

function appStatusBadge(s: string) {
    if (s === "APPLIED") return "badge status-draft";
    if (s === "SHORTLISTED" || s === "INTERVIEW") return "badge status-active";
    if (s === "HIRED") return "badge status-hired";
    if (s === "REJECTED") return "badge status-rejected";
    return "badge status-other";
}

function jobStatusBadge(s: string) {
    if (s === "ACTIVE") return "badge status-active";
    if (s === "DRAFT") return "badge status-draft";
    return "badge status-other";
}

function initials(name: string) {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function jobUrl(slug: string | null, id: string) {
    return slug ? `/jobs/${slug}/${id}` : `/jobs/${id}`;
}

export default async function AdminUserProfilePage({ params }: Props) {
    const profile = await getAdminUserProfileData(params.id);
    if (!profile) notFound();

    const { user, jobs, applications, stats } = profile;
    const isRecruiter = user.userRole === "RECRUITER";
    const isCandidate = user.userRole === "CANDIDATE";
    const loc = [user.city, user.state, user.country].filter((v) => v?.trim()).join(", ");

    const hasSocial = isSafeUrl(user.linkedin) || isSafeUrl(user.github) || isSafeUrl(user.twitter);
    const hasCompensation = !!(user.currentCTC?.trim() || user.expectedCTC?.trim() || user.noticePeriod?.trim());

    return (
        <div className="page-shell">
            <div className="page-wrap">
                {/* ── Header ──────────────────────────────────────── */}
                <section className="header-card">
                    <div className="profile-header">
                        {isSafeUrl(user.profileImageUrl) ? (
                            <img src={user.profileImageUrl} alt="" className="profile-avatar" />
                        ) : (
                            <div className="profile-avatar-placeholder">{initials(user.name)}</div>
                        )}
                        <div className="profile-info">
                            <h1 className="header-title" style={{ marginBottom: 3 }}>{user.name}</h1>
                            <p className="header-subtitle" style={{ marginTop: 0 }}>{user.email}</p>
                            <div className="header-meta" style={{ marginTop: 10 }}>
                                <span className="pill">{user.userRole}</span>
                                {user.companyName && <span className="pill">{user.companyName}</span>}
                                {loc && <span className="pill">{loc}</span>}
                                <span className="pill">Joined {fmt(user.createdAt)}</span>
                            </div>
                        </div>
                        <div className="profile-actions" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {user.companySlug && (
                                <Link href={`/c/${user.companySlug}`} className="btn" target="_blank">Dashboard ↗</Link>
                            )}
                            {user.resumeUrl && (
                                <a href={`/api/resume/view?url=${encodeURIComponent(user.resumeUrl)}`} target="_blank" rel="noopener noreferrer" className="btn primary">Resume ↗</a>
                            )}
                            <Link href={isRecruiter ? "/admin/recruiters" : "/admin/users"} className="btn">← Back</Link>
                        </div>
                    </div>
                </section>

                {/* ── Role-specific stats ──────────────────────────── */}
                {isCandidate && (
                    <section className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-label">Applications</div>
                            <div className="stat-value">{stats.totalApplications}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Shortlisted</div>
                            <div className="stat-value">{stats.shortlisted}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Interviews</div>
                            <div className="stat-value">{stats.interviews}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Hired</div>
                            <div className="stat-value">{stats.hired}</div>
                        </div>
                    </section>
                )}

                {isRecruiter && (
                    <section className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-label">Jobs Posted</div>
                            <div className="stat-value">{stats.totalJobsPosted}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Active Jobs</div>
                            <div className="stat-value">{stats.activeJobsPosted}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Applications Received</div>
                            <div className="stat-value">{stats.totalAppsReceived}</div>
                        </div>
                    </section>
                )}

                {!isCandidate && !isRecruiter && (
                    <section className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-label">Applications</div>
                            <div className="stat-value">{stats.totalApplications}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Jobs Posted</div>
                            <div className="stat-value">{stats.totalJobsPosted}</div>
                        </div>
                    </section>
                )}

                {/* ── Profile details ─────────────────────────────── */}
                <section className="panel">
                    <div className="toolbar">
                        <div className="row-title">Profile</div>
                    </div>
                    <div className="profile-detail-grid">
                        {/* Personal */}
                        <div className="profile-section-label">Personal</div>
                        <div className="meta-box">
                            <div className="meta-key">Phone</div>
                            <div className="meta-val">{val(user.phoneNumber)}</div>
                        </div>
                        <div className="meta-box">
                            <div className="meta-key">City</div>
                            <div className="meta-val">{val(user.city)}</div>
                        </div>
                        <div className="meta-box">
                            <div className="meta-key">State</div>
                            <div className="meta-val">{val(user.state)}</div>
                        </div>
                        <div className="meta-box">
                            <div className="meta-key">Country</div>
                            <div className="meta-val">{val(user.country)}</div>
                        </div>

                        {/* Social - only if any links exist */}
                        {hasSocial && (
                            <>
                                <div className="profile-section-label">Social</div>
                                {isSafeUrl(user.linkedin) && (
                                    <div className="meta-box">
                                        <div className="meta-key">LinkedIn</div>
                                        <div className="meta-val">
                                            <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="social-link">LinkedIn ↗</a>
                                        </div>
                                    </div>
                                )}
                                {isSafeUrl(user.github) && (
                                    <div className="meta-box">
                                        <div className="meta-key">GitHub</div>
                                        <div className="meta-val">
                                            <a href={user.github} target="_blank" rel="noopener noreferrer" className="social-link">GitHub ↗</a>
                                        </div>
                                    </div>
                                )}
                                {isSafeUrl(user.twitter) && (
                                    <div className="meta-box">
                                        <div className="meta-key">Twitter</div>
                                        <div className="meta-val">
                                            <a href={user.twitter} target="_blank" rel="noopener noreferrer" className="social-link">Twitter ↗</a>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Compensation - only for candidates with data */}
                        {isCandidate && hasCompensation && (
                            <>
                                <div className="profile-section-label">Compensation</div>
                                {user.currentCTC?.trim() && (
                                    <div className="meta-box">
                                        <div className="meta-key">Current CTC</div>
                                        <div className="meta-val">{user.currentCTC}</div>
                                    </div>
                                )}
                                {user.expectedCTC?.trim() && (
                                    <div className="meta-box">
                                        <div className="meta-key">Expected CTC</div>
                                        <div className="meta-val">{user.expectedCTC}</div>
                                    </div>
                                )}
                                {user.noticePeriod?.trim() && (
                                    <div className="meta-box">
                                        <div className="meta-key">Notice Period</div>
                                        <div className="meta-val">{user.noticePeriod}</div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* System */}
                        <div className="profile-section-label">System</div>
                        <div className="meta-box">
                            <div className="meta-key">User ID</div>
                            <div className="meta-val" style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace" }}>{user.id}</div>
                        </div>
                        <div className="meta-box">
                            <div className="meta-key">Role Selected</div>
                            <div className="meta-val">{fmt(user.roleSelectedAt)}</div>
                        </div>
                        <div className="meta-box">
                            <div className="meta-key">Last Updated</div>
                            <div className="meta-val">{fmt(user.updatedAt)}</div>
                        </div>
                    </div>
                </section>

                {/* ── Applications (candidates first, or recruiters only if they have any) ── */}
                {applications.length > 0 && (
                    <section className="panel">
                        <div className="toolbar">
                            <div className="row-title">
                                {isCandidate ? "Applications" : "Applications Submitted"} ({applications.length})
                            </div>
                        </div>
                        <div className="jobs-table-wrap" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
                            <table className="jobs-table">
                                <thead>
                                    <tr>
                                        <th>Job</th>
                                        <th>Company</th>
                                        <th>Status</th>
                                        <th>Applied</th>
                                        {isCandidate && <th>CTC</th>}
                                        {isCandidate && <th>Notice</th>}
                                        <th>Resume</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {applications.map((a) => (
                                        <tr key={a.id}>
                                            <td>
                                                {a.job ? (
                                                    <Link href={jobUrl(a.job.companySlug, a.jobId)} className="name-link" target="_blank" style={{ fontWeight: 700 }}>{a.job.title}</Link>
                                                ) : <span style={{ fontWeight: 700 }}>—</span>}
                                            </td>
                                            <td>{a.job?.company || "—"}</td>
                                            <td><span className={appStatusBadge(a.status)}>{a.status}</span></td>
                                            <td>{fmt(a.appliedAt)}</td>
                                            {isCandidate && (
                                                <td>
                                                    <span style={{ fontSize: 12 }}>
                                                        {[a.currentCurrency, a.currentCTC].filter(Boolean).join(" ") || "—"}
                                                        {" → "}
                                                        {[a.expectedCurrency, a.expectedCTC].filter(Boolean).join(" ") || "—"}
                                                    </span>
                                                </td>
                                            )}
                                            {isCandidate && <td>{val(a.noticePeriod)}</td>}
                                            <td>
                                                {a.resumeUrl ? (
                                                    <a href={`/api/resume/view?url=${encodeURIComponent(a.resumeUrl)}`} target="_blank" rel="noopener noreferrer" className="name-link" style={{ fontWeight: 600 }}>View ↗</a>
                                                ) : <span className="muted">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* ── Jobs Posted (recruiters first, or candidates only if they have any) ── */}
                {jobs.length > 0 && (
                    <section className="panel">
                        <div className="toolbar">
                            <div className="row-title">Jobs Posted ({jobs.length})</div>
                        </div>
                        <div className="jobs-table-wrap" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
                            <table className="jobs-table">
                                <thead>
                                    <tr>
                                        <th>Job</th>
                                        <th>Location</th>
                                        <th>Status</th>
                                        <th>Applicants</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.map((j) => (
                                        <tr key={j.id}>
                                            <td>
                                                <Link href={jobUrl(j.companySlug, j.id)} className="name-link" target="_blank" style={{ fontWeight: 700 }}>{j.title}</Link>
                                                <div className="row-sub">{j.company}</div>
                                            </td>
                                            <td>{j.location}</td>
                                            <td><span className={jobStatusBadge(j.status)}>{j.status}</span></td>
                                            <td style={{ fontWeight: 700 }}>{j.applicationCount}</td>
                                            <td>{fmt(j.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Show a message if the user has no activity at all */}
                {applications.length === 0 && jobs.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">{isRecruiter ? "📝" : "📋"}</div>
                        {isRecruiter ? "This recruiter hasn't posted any jobs yet" : "This candidate hasn't submitted any applications yet"}
                    </div>
                )}
            </div>
        </div>
    );
}
