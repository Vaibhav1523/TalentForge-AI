"use client";

import { useEffect, useState, useCallback } from "react";

type AdminEntry = {
    id: string | null;
    email: string;
    name: string;
    isSuperAdmin: boolean;
    source?: "env" | "db";
    addedAt?: string | null;
};

export default function AdminSettingsPage() {
    const [admins, setAdmins] = useState<AdminEntry[]>([]);
    const [superEmail, setSuperEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newRole, setNewRole] = useState<"admin" | "super">("admin");
    const [adding, setAdding] = useState(false);
    const [feedback, setFeedback] = useState("");

    const fetchAdmins = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await fetch("/api/admin/admins");
            if (!res.ok) {
                if (res.status === 403) { setError("Only the super admin can manage admin access."); return; }
                throw new Error("Failed to load");
            }
            const data = await res.json();
            setAdmins(data.admins ?? []);
            setSuperEmail(data.superAdminEmail ?? "");
        } catch {
            setError("Failed to load admin list.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

    async function addAdmin(e: React.FormEvent) {
        e.preventDefault();
        const email = newEmail.trim().toLowerCase();
        if (!email) return;

        setAdding(true);
        setFeedback("");
        try {
            const res = await fetch("/api/admin/admins", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, role: newRole }),
            });
            if (!res.ok) {
                let errMsg = "Failed to add admin.";
                try { const errBody = await res.json(); errMsg = errBody.error ?? errMsg; } catch { /* non-JSON error body */ }
                setFeedback(errMsg);
                return;
            }
            const data = await res.json();
            setFeedback(`${data.name ?? email} added as admin.`);
            setNewEmail("");
            fetchAdmins();
        } catch {
            setFeedback("Network error.");
        } finally {
            setAdding(false);
        }
    }

    async function removeAdmin(email: string) {
        if (!confirm(`Remove admin access for ${email}?`)) return;

        setFeedback("");
        try {
            const res = await fetch("/api/admin/admins", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                let errMsg = "Failed to remove admin.";
                try { const errBody = await res.json(); errMsg = errBody.error ?? errMsg; } catch { /* non-JSON error body */ }
                setFeedback(errMsg);
                return;
            }
            await res.json();
            setFeedback(`${email} removed from admins.`);
            fetchAdmins();
        } catch {
            setFeedback("Network error.");
        }
    }

    return (
        <div className="page-shell">
            <div className="page-wrap">
                <section className="header-card">
                    <h1 className="header-title">Settings</h1>
                    <p className="header-subtitle">Manage platform administrators</p>
                </section>

                {/* Super Admin info */}
                <section className="panel">
                    <div className="toolbar">
                        <div>
                            <div className="row-title">Bootstrap super admin (environment)</div>
                            <div className="row-sub" style={{ marginTop: 2 }}>
                                Optional break-glass account from <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>SUPER_ADMIN_EMAIL</code>. You can also grant super admin in the database from this page.
                            </div>
                        </div>
                    </div>
                    <div className="meta-box" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="avatar-sm" style={{ background: "linear-gradient(135deg, rgba(78,234,173,0.14), rgba(92,207,255,0.10))", color: "var(--green)", borderColor: "rgba(78,234,173,0.16)" }}>
                            SA
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{superEmail || "Not set"}</div>
                            <div className="row-sub">Change only in server env (e.g. Cloud Run / Secret Manager)</div>
                        </div>
                    </div>
                </section>

                {/* Current admins */}
                <section className="panel">
                    <div className="toolbar">
                        <div>
                            <div className="row-title">Administrators ({admins.length})</div>
                            <div className="row-sub" style={{ marginTop: 2 }}>Users with access to this admin panel</div>
                        </div>
                    </div>

                    {error && (
                        <div className="empty-state" style={{ borderColor: "rgba(247,110,138,0.2)", color: "var(--red)" }}>
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="empty-state">Loading…</div>
                    ) : admins.length === 0 && !error ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🔒</div>
                            No admins configured. Add one below.
                        </div>
                    ) : (
                        <div className="jobs-table-wrap" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
                            <table className="jobs-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Source</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.map((a) => (
                                        <tr key={a.email}>
                                            <td>
                                                <div className="user-cell">
                                                    <div className={`avatar-sm ${a.isSuperAdmin ? "green" : ""}`}>
                                                        {a.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
                                                    </div>
                                                    <div className="user-cell-info">
                                                        <span style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</span>
                                                        <div className="row-sub">{a.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {a.isSuperAdmin ? (
                                                    <span className="badge status-active">Super Admin</span>
                                                ) : (
                                                    <span className="badge status-other">Admin</span>
                                                )}
                                            </td>
                                            <td>
                                                {a.source === "env" ? (
                                                    <span className="badge status-draft no-dot" style={{ fontSize: 10 }}>ENV</span>
                                                ) : (
                                                    <span className="badge role-candidate no-dot" style={{ fontSize: 10 }}>Database</span>
                                                )}
                                            </td>
                                            <td>
                                                {a.source !== "env" && (
                                                    <button
                                                        type="button"
                                                        className="btn"
                                                        onClick={() => removeAdmin(a.email)}
                                                        style={{ padding: "4px 10px", fontSize: 11, color: "var(--red)", borderColor: "rgba(247,110,138,0.18)" }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                                {a.source === "env" && (
                                                    <span className="muted" style={{ fontSize: 11 }}>
                                                        {a.isSuperAdmin ? "Edit SUPER_ADMIN_EMAIL in .env" : "Edit ADMIN_EMAILS in .env"}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Add new admin */}
                <section className="panel">
                    <div className="toolbar">
                        <div>
                            <div className="row-title">Add admin or super admin</div>
                            <div className="row-sub" style={{ marginTop: 2 }}>
                                User must already have signed up. Super admins can manage this page and open recruiter pipelines from Admin → Jobs.
                            </div>
                        </div>
                    </div>
                    <form onSubmit={addAdmin} style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                        <div className="filter-field" style={{ flex: 1, minWidth: 200 }}>
                            <label htmlFor="admin-email" className="filter-label">Email Address</label>
                            <input
                                id="admin-email"
                                type="email"
                                className="control-input"
                                placeholder="user@example.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="filter-field" style={{ minWidth: 160 }}>
                            <label htmlFor="admin-role" className="filter-label">Role</label>
                            <select
                                id="admin-role"
                                className="control-input"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value === "super" ? "super" : "admin")}
                            >
                                <option value="admin">Admin</option>
                                <option value="super">Super admin</option>
                            </select>
                        </div>
                        <button type="submit" className="btn primary" disabled={adding} style={{ padding: "9px 20px" }}>
                            {adding ? "Adding…" : "Grant access"}
                        </button>
                    </form>
                    {feedback && (
                        <div style={{ marginTop: 10 }}>
                            <span className={`badge ${feedback.includes("error") || feedback.includes("Failed") || feedback.includes("not") || feedback.includes("Cannot") || feedback.includes("No user") || feedback.includes("already") ? "status-rejected" : "status-active"} no-dot`} style={{ fontSize: 12 }}>
                                {feedback}
                            </span>
                        </div>
                    )}
                </section>

                {/* Info */}
                <section className="panel" style={{ opacity: 0.7 }}>
                    <div className="row-title" style={{ fontSize: 13, marginBottom: 6 }}>How it works</div>
                    <div className="row-sub" style={{ lineHeight: 1.7, fontSize: 12.5 }}>
                        <strong>Super admin</strong> can be the <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>SUPER_ADMIN_EMAIL</code> env identity and/or users marked <strong>Super admin</strong> in the database from this page.
                        At least one super path (env or DB) should exist before revoking the last DB super admin.<br />
                        <strong>Env admins</strong> come from <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>ADMIN_EMAILS</code>; edit the server config to change them.<br />
                        <strong>Database admins</strong> are added/removed here; promote an existing admin to super with the same email and role <strong>Super admin</strong> (or grant super directly).
                    </div>
                </section>
            </div>
        </div>
    );
}
