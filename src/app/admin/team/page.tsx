"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Brain, Briefcase, TrendingUp, Cpu, Settings2, Handshake, MessageCircle, Rocket,
  Heart, Shield, Zap, Star, Globe, Code, Palette, Target,
  Trophy, Users, Lightbulb, Sparkles,
} from "lucide-react";

const ICON_OPTIONS = [
  "Brain", "Briefcase", "TrendingUp", "Cpu", "Settings2", "Handshake", "MessageCircle", "Rocket",
  "Heart", "Shield", "Zap", "Star", "Globe", "Code", "Palette", "Target",
  "Trophy", "Users", "Lightbulb", "Sparkles",
] as const;

const ICON_MAP: Record<string, LucideIcon> = {
  Brain, Briefcase, TrendingUp, Cpu, Settings2, Handshake, MessageCircle, Rocket,
  Heart, Shield, Zap, Star, Globe, Code, Palette, Target,
  Trophy, Users, Lightbulb, Sparkles,
};

const TILT_OPTIONS = [
  { value: "tilt-left-1", label: "Left" },
  { value: "tilt-center", label: "Center (featured)" },
  { value: "tilt-right-1", label: "Right" },
];

type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl: string | null;
  iconName: string;
  tilt: string;
  featured: boolean;
  sortOrder: number;
};

const EMPTY_MEMBER: Omit<TeamMember, "id" | "sortOrder"> = {
  name: "",
  role: "",
  bio: "",
  avatarUrl: null,
  iconName: "Brain",
  tilt: "tilt-center",
  featured: false,
};

function avatarNeedsUnoptimized(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("/api/") || url.startsWith("http://") || url.startsWith("https://");
}

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showFeedback = (message: string, ok = false) => {
    setFeedback(message);
    setFeedbackOk(ok);
  };

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError("");
      const res = await fetch("/api/admin/team", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load (${res.status})`);
      }
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load team members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  function startAdd() {
    setEditing({ ...EMPTY_MEMBER, id: "", sortOrder: members.length } as TeamMember);
    setIsNew(true);
    showFeedback("");
  }

  function startEdit(m: TeamMember) {
    setEditing({ ...m });
    setIsNew(false);
    showFeedback("");
  }

  function cancelEdit() {
    setEditing(null);
    setIsNew(false);
    showFeedback("");
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    if (file.size > 2 * 1024 * 1024) {
      showFeedback("Image must be under 2 MB.");
      return;
    }
    setUploading(true);
    showFeedback("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", editing.name || "member");
      form.append("role", editing.role || "");
      const res = await fetch("/api/upload/team-photo", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showFeedback(body.error ?? "Upload failed.");
        return;
      }
      setEditing((prev) => (prev ? { ...prev, avatarUrl: body.photoUrl } : prev));
      showFeedback(body.warning ? `Photo uploaded (${body.warning})` : "Photo uploaded — click Save Changes to publish.", true);
    } catch {
      showFeedback("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.role.trim()) {
      showFeedback("Name and role are required.");
      return;
    }
    setSaving(true);
    showFeedback("");
    try {
      const method = isNew ? "POST" : "PUT";
      const payload = isNew
        ? {
            name: editing.name,
            role: editing.role,
            bio: editing.bio,
            avatarUrl: editing.avatarUrl,
            iconName: editing.iconName,
            tilt: editing.tilt,
            featured: editing.featured,
            sortOrder: editing.sortOrder,
          }
        : {
            id: editing.id,
            name: editing.name,
            role: editing.role,
            bio: editing.bio,
            avatarUrl: editing.avatarUrl,
            iconName: editing.iconName,
            tilt: editing.tilt,
            featured: editing.featured,
            sortOrder: editing.sortOrder,
          };
      const res = await fetch("/api/admin/team", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showFeedback(body.error ?? "Save failed.");
        return;
      }
      cancelEdit();
      await fetchMembers();
      showFeedback(isNew ? "Team member added." : "Profile updated — homepage will show the new details.", true);
    } catch {
      showFeedback("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from the team?`)) return;
    setDeleting(id);
    showFeedback("");
    try {
      const res = await fetch("/api/admin/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showFeedback(body.error ?? "Delete failed.");
        return;
      }
      await fetchMembers();
      showFeedback(`${name} removed from the team.`, true);
    } catch {
      showFeedback("Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  const Icon = editing ? (ICON_MAP[editing.iconName] ?? Brain) : Brain;

  return (
    <div className="page-shell">
      <div className="page-wrap">
        <section className="header-card">
          <h1 className="header-title">Team profiles</h1>
          <p className="header-subtitle">
            Update founder/leadership names, roles, bios, and photos shown on the homepage and founders page.
          </p>
        </section>

        {fetchError && (
          <div className="empty-state" style={{ borderColor: "rgba(247,110,138,0.2)", color: "var(--red)" }}>
            {fetchError}
          </div>
        )}

        {feedback && !editing && (
          <div
            className="panel"
            style={{
              padding: "12px 16px",
              borderColor: feedbackOk ? "rgba(78,234,173,0.35)" : "rgba(247,110,138,0.25)",
              color: feedbackOk ? "var(--green)" : "var(--red)",
              marginBottom: 12,
            }}
          >
            {feedback}
          </div>
        )}

        {editing && (
          <section className="panel">
            <div className="toolbar">
              <div className="row-title">{isNew ? "Add Team Member" : `Edit profile — ${editing.name || "Unnamed"}`}</div>
              <button type="button" className="btn" onClick={cancelEdit}>Cancel</button>
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 88, height: 88, borderRadius: "999px", overflow: "hidden",
                  border: "2px solid var(--line)", flexShrink: 0, display: "flex",
                  alignItems: "center", justifyContent: "center", background: "var(--surface)",
                }}>
                  {editing.avatarUrl ? (
                    <Image
                      src={editing.avatarUrl}
                      alt={editing.name || "Team member"}
                      width={88}
                      height={88}
                      unoptimized={avatarNeedsUnoptimized(editing.avatarUrl)}
                      style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    />
                  ) : (
                    <Icon size={28} strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{ fontSize: 12, padding: "6px 14px" }}
                  >
                    {uploading ? "Uploading…" : editing.avatarUrl ? "Change Photo" : "Upload Photo"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} style={{ display: "none" }} />
                  <div className="row-sub" style={{ marginTop: 4 }}>JPG, PNG or WebP · max 2 MB</div>
                  {editing.avatarUrl && (
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: 11, padding: "3px 10px", marginTop: 4, color: "var(--red)", borderColor: "rgba(247,110,138,0.18)" }}
                      onClick={() => setEditing({ ...editing, avatarUrl: null })}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              <div className="filter-field" style={{ gridColumn: "1 / -1" }}>
                <label className="filter-label">Photo URL (optional override)</label>
                <input
                  className="control-input"
                  value={editing.avatarUrl ?? ""}
                  onChange={(e) => setEditing({ ...editing, avatarUrl: e.target.value.trim() || null })}
                  placeholder="/team/name.png or /api/images/team/…"
                />
              </div>

              <div className="filter-field">
                <label className="filter-label">Name</label>
                <input className="control-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Full name" />
              </div>

              <div className="filter-field">
                <label className="filter-label">Role / Title</label>
                <input className="control-input" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} placeholder="e.g. CEO" />
              </div>

              <div className="filter-field" style={{ gridColumn: "1 / -1" }}>
                <label className="filter-label">Bio</label>
                <textarea className="control-input" rows={3} value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} placeholder="Short description shown on the homepage card…" />
              </div>

              <div className="filter-field">
                <label className="filter-label">Icon</label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {ICON_OPTIONS.map((name) => {
                    const Ic = ICON_MAP[name];
                    const active = editing.iconName === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => setEditing({ ...editing, iconName: name })}
                        style={{
                          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: 6, border: `1px solid ${active ? "var(--cyan)" : "var(--line)"}`,
                          background: active ? "var(--cyan-soft)" : "transparent", color: active ? "var(--cyan)" : "var(--muted)",
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        <Ic size={15} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="filter-field">
                <label className="filter-label">Card Position</label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {TILT_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={`btn ${editing.tilt === t.value ? "active" : ""}`}
                      onClick={() => setEditing({
                        ...editing,
                        tilt: t.value,
                        featured: t.value === "tilt-center" ? true : editing.featured,
                      })}
                      style={{ fontSize: 11, padding: "4px 10px" }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-field" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label className="filter-label" style={{ marginBottom: 0 }}>Featured</label>
                <input
                  type="checkbox"
                  checked={editing.featured}
                  onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: "var(--cyan)", cursor: "pointer" }}
                />
              </div>

              <div className="filter-field">
                <label className="filter-label">Sort Order</label>
                <input
                  type="number"
                  className="control-input"
                  value={editing.sortOrder}
                  onChange={(e) => setEditing({ ...editing, sortOrder: parseInt(e.target.value, 10) || 0 })}
                  style={{ maxWidth: 100 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="btn primary" onClick={handleSave} disabled={saving || uploading} style={{ padding: "9px 20px" }}>
                {saving ? "Saving…" : isNew ? "Add Member" : "Save Changes"}
              </button>
              <button type="button" className="btn" onClick={cancelEdit}>Cancel</button>
              {feedback && (
                <span
                  className={`badge no-dot ${feedbackOk ? "status-active" : "status-rejected"}`}
                  style={{ fontSize: 12, marginLeft: "auto" }}
                >
                  {feedback}
                </span>
              )}
            </div>
          </section>
        )}

        <section className="panel">
          <div className="toolbar">
            <div>
              <div className="row-title">Team Members ({members.length})</div>
              <div className="row-sub" style={{ marginTop: 2 }}>Click Edit to update any profile — changes appear on the homepage</div>
            </div>
            <button type="button" className="btn primary" onClick={startAdd} disabled={!!editing}>+ Add Member</button>
          </div>

          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : members.length === 0 && !fetchError ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              No team members yet. Add one above.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((m) => {
                const MIcon = ICON_MAP[m.iconName] ?? Brain;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                      border: "1px solid var(--line)", borderRadius: "var(--radius-md)",
                      background: "var(--surface)", transition: "all var(--transition)",
                    }}
                  >
                    <div style={{
                      width: 52, height: 52, borderRadius: "999px", overflow: "hidden",
                      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid var(--line)", background: "var(--surface)",
                    }}>
                      {m.avatarUrl ? (
                        <Image
                          src={m.avatarUrl}
                          alt={m.name}
                          width={52}
                          height={52}
                          unoptimized={avatarNeedsUnoptimized(m.avatarUrl)}
                          style={{ objectFit: "cover", width: "100%", height: "100%" }}
                        />
                      ) : (
                        <MIcon size={20} strokeWidth={1.5} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                        {m.featured && <span className="badge status-active no-dot" style={{ fontSize: 10 }}>Featured</span>}
                      </div>
                      <div className="row-sub">{m.role}</div>
                      {m.bio ? (
                        <div className="row-sub" style={{ marginTop: 4, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.bio}
                        </div>
                      ) : null}
                    </div>

                    <span className="muted" style={{ fontSize: 11, flexShrink: 0 }}>#{m.sortOrder}</span>

                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button type="button" className="btn primary" onClick={() => startEdit(m)} disabled={!!editing} style={{ padding: "5px 12px", fontSize: 12 }}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleDelete(m.id, m.name)}
                        disabled={!!editing || deleting === m.id}
                        style={{ padding: "5px 12px", fontSize: 12, color: "var(--red)", borderColor: "rgba(247,110,138,0.18)" }}
                      >
                        {deleting === m.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
