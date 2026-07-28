'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import {
    User,
    Building2,
    Bell,
    Shield,
    CreditCard,
    Link as LinkIcon,
    ChevronRight,
    Save,
    Upload,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

function toSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export default function CompanySettingsPage() {
    const { update: updateSession, data: sessionData } = useSession();
    const sessionUserId = sessionData?.user && 'id' in sessionData.user ? (sessionData.user as { id: string }).id : '';
    const router = useRouter();
    const params = useParams<{ company: string }>();
    const companySlug = typeof params.company === 'string' ? params.company : '';
    /** Lets platform admins load `/c/:slug/settings` as that tenant (`/api/*?companySlug=`). */
    const companyScopeQuery = useMemo(
        () => (companySlug ? `?companySlug=${encodeURIComponent(companySlug)}` : ''),
        [companySlug],
    );

    const [notifications, setNotifications] = useState<Record<string, boolean>>({
        newApplications: true,
        interviewUpdates: true,
        platformNews: true,
    });
    const [companyName, setCompanyName] = useState('');
    const [companyWebsite, setCompanyWebsite] = useState('');
    const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    // Track initial (saved) values to detect unsaved changes
    const [initialName, setInitialName] = useState('');
    const [initialWebsite, setInitialWebsite] = useState('');
    const [initialLogoUrl, setInitialLogoUrl] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);

    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [organizationRole, setOrganizationRole] = useState<string | null>(null);
    const [members, setMembers] = useState<
        { id: string; name: string | null; email: string | null; organizationRole: string | null }[]
    >([]);
    const [invites, setInvites] = useState<{ id: string; email: string; expiresAt: string }[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [teamBusy, setTeamBusy] = useState(false);
    const [teamLoading, setTeamLoading] = useState(false);

    const logoInputRef = useRef<HTMLInputElement>(null);

    // Slug is always derived from company name — read-only for the user
    const derivedSlug = useMemo(() => toSlug(companyName), [companyName]);

    // Disable Save if nothing changed or slug would be empty
    const hasChanges =
        companyName !== initialName ||
        companyWebsite !== initialWebsite ||
        companyLogoUrl !== initialLogoUrl ||
        !!logoFile;
    const slugEmpty = !derivedSlug;

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/profile${companyScopeQuery}`);
                if (!res.ok) {
                    let errorMsg = `Failed to load settings (${res.status})`;
                    try {
                        const errData = await res.json();
                        errorMsg = errData.error || errorMsg;
                    } catch {
                        /* non-JSON error body */
                    }
                    toast.error(errorMsg);
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                setNotifications({
                    newApplications: data.notificationNewApplications !== false,
                    interviewUpdates: data.notificationInterviewUpdates !== false,
                    platformNews: data.notificationPlatformNews !== false,
                });
                const name = data.companyName ?? '';
                const website = data.companyWebsite ?? '';
                const logo = data.companyLogoUrl ?? null;
                setCompanyName(name);
                setCompanyWebsite(website);
                setCompanyLogoUrl(logo);
                setInitialName(name);
                setInitialWebsite(website);
                setInitialLogoUrl(logo);
                setOrganizationId(data.organizationId ?? null);
                setOrganizationRole(data.organizationRole ?? null);
            } catch {
                toast.error('Failed to load settings');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [companyScopeQuery]);

    const orgMemberReadOnly = Boolean(organizationId && organizationRole === 'MEMBER');
    const canManageTeam =
        organizationId && organizationRole && ['OWNER', 'ADMIN'].includes(organizationRole);

    const refreshTeam = async () => {
        if (!organizationId) return;
        setTeamLoading(true);
        try {
            const [mRes, iRes] = await Promise.all([
                fetch(`/api/organization/members${companyScopeQuery}`),
                canManageTeam ? fetch(`/api/organization/invites${companyScopeQuery}`) : Promise.resolve(null),
            ]);
            if (mRes.ok) {
                const m = await mRes.json();
                setMembers(m.members ?? []);
            }
            if (iRes && iRes.ok) {
                const inv = await iRes.json();
                setInvites(inv.invites ?? []);
            }
        } catch {
            /* ignore */
        } finally {
            setTeamLoading(false);
        }
    };

    useEffect(() => {
        if (organizationId) void refreshTeam();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when org appears
    }, [organizationId, canManageTeam, companyScopeQuery]);

    const [logoError, setLogoError] = useState('');

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const MAX_SIZE = 800 * 1024;
        if (file.size > MAX_SIZE) {
            setLogoError('File exceeds 800 KB limit. Please choose a smaller image.');
            e.target.value = '';
            return;
        }
        setLogoError('');
        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleNotificationToggle = async (key: string, next: boolean) => {
        const apiKey =
            key === 'newApplications' ? 'notificationNewApplications'
            : key === 'interviewUpdates' ? 'notificationInterviewUpdates'
            : 'notificationPlatformNews';
        setNotifications(prev => ({ ...prev, [key]: next }));
        try {
            const res = await fetch(`/api/profile${companyScopeQuery}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [apiKey]: next }),
            });
            if (!res.ok) throw new Error('Save failed');
            toast.success('Preferences saved');
        } catch {
            setNotifications(prev => ({ ...prev, [key]: !next }));
            toast.error('Failed to save preferences');
        }
    };

    const handleSaveCompanyProfile = async () => {
        setSaving(true);
        try {
            let newLogoUrl: string | undefined;

            // Upload new logo if one was selected
            if (logoFile) {
                setLogoUploading(true);
                const form = new FormData();
                form.append('file', logoFile);
                const uploadRes = await fetch('/api/upload/company-logo', {
                    method: 'POST',
                    body: form,
                });
                setLogoUploading(false);
                if (uploadRes.ok) {
                    const uploadBody = await uploadRes.json();
                    newLogoUrl = uploadBody.logoUrl;
                } else {
                    toast.error('Logo upload failed — profile details still saved');
                }
            }

            const res = await fetch(`/api/profile${companyScopeQuery}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName: companyName.trim() || undefined,
                    companyWebsite: companyWebsite.trim() || "",
                    companySlug: derivedSlug || undefined,
                    ...(newLogoUrl && { companyLogoUrl: newLogoUrl }),
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error ?? 'Failed to save');
            }

            const saved = await res.json();

            // Sync state with what was persisted
            const savedName = saved?.companyName ?? companyName;
            const savedWebsite = saved?.companyWebsite ?? companyWebsite;
            const savedLogo = newLogoUrl ?? companyLogoUrl;

            setInitialName(savedName);
            setInitialWebsite(savedWebsite);
            setInitialLogoUrl(savedLogo);

            if (newLogoUrl) {
                setCompanyLogoUrl(newLogoUrl);
                setLogoFile(null);
                setLogoPreview(null);
            }
            toast.success('Company profile saved');

            // Refresh JWT so middleware + session see the new companySlug
            await updateSession();

            // If the slug changed, navigate to the new URL (path is source of truth for routing)
            const slugNorm = (s: string) => s.trim().toLowerCase();
            const newSlug =
                (typeof saved?.companySlug === 'string' && saved.companySlug.trim()) || toSlug(savedName);
            const pathSlug = typeof params.company === 'string' ? params.company : '';
            if (newSlug && slugNorm(newSlug) !== slugNorm(pathSlug)) {
                router.replace(`/c/${encodeURIComponent(newSlug)}/settings`);
            }
            setOrganizationId(saved?.organizationId ?? organizationId);
            setOrganizationRole(saved?.organizationRole ?? organizationRole);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
            setLogoUploading(false);
        }
    };

    const logoSrc = logoPreview ?? companyLogoUrl;

    const sendInvite = async () => {
        if (!inviteEmail.trim()) return;
        setTeamBusy(true);
        try {
            const res = await fetch(`/api/organization/invites${companyScopeQuery}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim() }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || 'Invite failed');
            toast.success('Invite created — copy the link below');
            setInviteEmail('');
            if (body.inviteUrl) {
                try {
                    await navigator.clipboard.writeText(body.inviteUrl);
                    toast.message('Invite link copied to clipboard');
                } catch (clipErr) {
                    console.error(clipErr);
                    toast.error('Unable to copy invite link');
                }
            }
            void refreshTeam();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Invite failed');
        } finally {
            setTeamBusy(false);
        }
    };

    const removeMember = async (id: string) => {
        if (!confirm('Remove this recruiter from your organization?')) return;
        setTeamBusy(true);
        try {
            const res = await fetch(`/api/organization/members/${id}${companyScopeQuery}`, { method: 'DELETE' });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || 'Remove failed');
            toast.success('Member removed');
            void refreshTeam();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Remove failed');
        } finally {
            setTeamBusy(false);
        }
    };

    return (
        <div className="dashboard-page-content company-settings-page">
            <header className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Manage your company profile and account preferences.</p>
                </div>
            </header>

            <div className="dashboard-content-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Company Profile Section */}
                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                            <h3 className="company-settings-section-title" style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>Company Profile</h3>
                        </div>
                        <div style={{ padding: '32px' }}>
                            {/* Logo */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    aria-label="Upload company logo"
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '20px',
                                        backgroundColor: '#f3f4f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px dashed #e2e8f0',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        cursor: orgMemberReadOnly ? 'default' : 'pointer',
                                        ...(orgMemberReadOnly ? { opacity: 0.65, pointerEvents: 'none' as const } : {}),
                                    }}
                                    onClick={() => !orgMemberReadOnly && logoInputRef.current?.click()}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!orgMemberReadOnly) logoInputRef.current?.click(); } }}
                                >
                                    {logoSrc ? (
                                        <Image
                                            src={logoSrc}
                                            alt="Company logo"
                                            fill
                                            sizes="100px"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <Upload size={32} style={{ color: '#9ca3af' }} />
                                    )}
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                        onChange={handleLogoChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Company Logo</h4>
                                    <p className="company-settings-muted-text" style={{ fontSize: '13px', color: '#6b7280', marginBottom: logoError ? '4px' : '12px' }}>JPG, PNG, SVG or WebP · max 800 KB</p>
                                    {logoError && <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>{logoError}</p>}
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ padding: '8px 16px', height: 'auto', fontSize: '13px' }}
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={orgMemberReadOnly}
                                    >
                                        {logoSrc ? 'Change Logo' : 'Upload Logo'}
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <p className="company-settings-muted-text" style={{ color: '#9ca3af', fontSize: '14px' }}>Loading…</p>
                            ) : (
                                <>
                                {orgMemberReadOnly && (
                                    <p className="company-settings-muted-text" style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                                        Company branding is managed by an owner or admin. You can still use jobs, applications, and the rest of the dashboard.
                                    </p>
                                )}
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Company Name
                                            <span style={{ color: 'rgba(239,68,68,0.85)', marginLeft: '3px' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Acme Corp"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            style={slugEmpty ? { borderColor: 'rgba(239,68,68,0.6)' } : undefined}
                                            disabled={orgMemberReadOnly}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Website URL</label>
                                        <input
                                            type="url"
                                            className="form-input"
                                            placeholder="https://acme.com"
                                            value={companyWebsite}
                                            onChange={(e) => setCompanyWebsite(e.target.value)}
                                            disabled={orgMemberReadOnly}
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '16px' }}>
                                    <label className="form-label">
                                        Dashboard URL
                                    </label>
                                    <div className="company-settings-dashboard-url-shell" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0,
                                        background: 'var(--input-bg, #f9fafb)',
                                        border: '1px solid var(--input-border, #e5e7eb)',
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        opacity: 0.75,
                                    }}>
                                        <span className="company-settings-dashboard-url-prefix" style={{
                                            padding: '10px 12px',
                                            fontSize: '14px',
                                            color: 'var(--text-muted, #9ca3af)',
                                            whiteSpace: 'nowrap',
                                            borderRight: '1px solid var(--input-border, #e5e7eb)',
                                            userSelect: 'none',
                                        }}>
                                            {process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'hookstep.in'}/
                                        </span>
                                        <input
                                            type="text"
                                            className="form-input company-settings-dashboard-url-input"
                                            value={derivedSlug || '…'}
                                            readOnly
                                            style={{
                                                border: 'none',
                                                borderRadius: 0,
                                                background: 'transparent',
                                                cursor: 'not-allowed',
                                                flex: 1,
                                            }}
                                        />
                                    </div>
                                    {slugEmpty ? (
                                        <p style={{ fontSize: '12px', color: 'rgba(239,68,68,0.9)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                            Company name is required — your dashboard URL cannot be empty.
                                        </p>
                                    ) : (
                                        <p className="company-settings-muted-text" style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                            Auto-generated from your company name. Updates when you save.
                                        </p>
                                    )}
                                </div>
                                </>
                            )}

                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onClick={handleSaveCompanyProfile}
                                    disabled={saving || logoUploading || loading || !hasChanges || slugEmpty || orgMemberReadOnly}
                                >
                                    <Save size={18} />
                                    {saving ? (logoUploading ? 'Uploading logo…' : 'Saving…') : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Team / recruiters */}
                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                            <h3 className="company-settings-section-title" style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Users size={20} aria-hidden />
                                Team &amp; recruiters
                            </h3>
                        </div>
                        <div style={{ padding: '24px 32px 32px' }}>
                            {!organizationId ? (
                                <p className="company-settings-muted-text" style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                                    Save your company profile above to create your organization. Then you can invite other recruiters by email — they&apos;ll share this dashboard, jobs, and applicants.
                                </p>
                            ) : teamLoading ? (
                                <p className="company-settings-muted-text" style={{ color: '#9ca3af' }}>Loading team…</p>
                            ) : (
                                <>
                                    <p className="company-settings-muted-text" style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                                        Everyone here uses the same company URL ({params.company}) and sees the same jobs and applications.
                                    </p>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                                        {members.map((m) => (
                                            <li
                                                key={m.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 0',
                                                    borderBottom: '1px solid #f3f4f6',
                                                    fontSize: '14px',
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{m.name || m.email || 'Recruiter'}</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{m.email}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                                                        {m.organizationRole || '—'}
                                                    </span>
                                                    {organizationRole === 'OWNER' && m.organizationRole !== 'OWNER' && m.id !== sessionUserId ? (
                                                        <button
                                                            type="button"
                                                            className="btn-secondary"
                                                            style={{ padding: '4px 10px', fontSize: '12px' }}
                                                            disabled={teamBusy}
                                                            onClick={() => void removeMember(m.id)}
                                                        >
                                                            Remove
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    {canManageTeam ? (
                                        <>
                                            <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Invite recruiter</h4>
                                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                                                They must sign up (or sign in) as a recruiter using this exact email, then open the invite link.
                                            </p>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '20px' }}>
                                                <input
                                                    type="email"
                                                    className="form-input"
                                                    placeholder="colleague@company.com"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    style={{ flex: '1 1 220px', minWidth: 0 }}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-primary"
                                                    disabled={teamBusy || !inviteEmail.trim()}
                                                    onClick={() => void sendInvite()}
                                                >
                                                    Create invite link
                                                </button>
                                            </div>
                                            {invites.length > 0 && (
                                                <div>
                                                    <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Pending invites</h4>
                                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                        {invites.map((inv) => (
                                                            <li key={inv.id} style={{ fontSize: '13px', color: '#64748b', padding: '6px 0' }}>
                                                                {inv.email} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Email Notifications Section */}
                    <div className="card" style={{ padding: '0' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                            <h3 className="company-settings-section-title" style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>Email Notifications</h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            {[
                                { key: 'newApplications', title: 'New Applications', desc: 'Get notified when someone applies for a job' },
                                { key: 'interviewUpdates', title: 'Interview Updates', desc: 'Receive updates about scheduled interviews' },
                                { key: 'platformNews', title: 'Platform News', desc: 'Stay updated with HookStep features and announcements' }
                            ].map((item, i) => {
                                const on = notifications[item.key] ?? true;
                                return (
                                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i === 2 ? 'none' : '1px solid #f9fafb' }}>
                                        <div>
                                            <h4 className="company-settings-notification-title" style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>{item.title}</h4>
                                            <p className="company-settings-notification-desc" style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{item.desc}</p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={on}
                                            aria-label={`Toggle ${item.title}`}
                                            onClick={() => handleNotificationToggle(item.key, !on)}
                                            className="company-settings-notification-toggle"
                                            style={{
                                                width: '44px',
                                                minWidth: '44px',
                                                height: '24px',
                                                minHeight: '24px',
                                                maxHeight: '24px',
                                                backgroundColor: on ? '#3b82f6' : '#d1d5db',
                                                borderRadius: '99px',
                                                position: 'relative',
                                                cursor: 'pointer',
                                                border: 'none',
                                                padding: 0,
                                                lineHeight: 0,
                                                transition: 'background-color 0.2s',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <span
                                                className="company-settings-notification-toggle-thumb"
                                                style={{
                                                    position: 'absolute',
                                                    left: on ? 'calc(100% - 20px)' : '4px',
                                                    top: '4px',
                                                    width: '16px',
                                                    height: '16px',
                                                    backgroundColor: 'white',
                                                    borderRadius: '50%',
                                                    transition: 'left 0.2s',
                                                }}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar Navigation */}
                <div className="dashboard-sidebar-col">
                    <div className="card" style={{ padding: '12px' }}>
                        {[
                            { icon: User, label: 'Profile', enabled: false },
                            { icon: Building2, label: 'Company', enabled: true },
                            { icon: Bell, label: 'Notifications', enabled: false },
                            { icon: Shield, label: 'Security', enabled: false },
                            { icon: CreditCard, label: 'Billing', enabled: false },
                            { icon: LinkIcon, label: 'Integrations', enabled: false }
                        ].map((item, i) => (
                            <button
                                type="button"
                                key={item.label}
                                className={`company-settings-nav-btn${i === 1 ? ' is-active' : ''}`}
                                aria-disabled={!item.enabled}
                                onClick={() => {
                                    if (!item.enabled) return;
                                    const el = document.querySelector('.dashboard-content-grid > div:first-child');
                                    el?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    border: 'none',
                                    background: i === 1 ? '#eff6ff' : 'transparent',
                                    color: i === 1 ? '#3b82f6' : item.enabled ? '#4b5563' : '#9ca3af',
                                    borderRadius: '10px',
                                    cursor: item.enabled ? 'pointer' : 'default',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    opacity: item.enabled ? 1 : 0.6,
                                }}
                            >
                                <item.icon size={18} />
                                {item.label}
                                {!item.enabled && i !== 1 && <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#9ca3af' }}>Soon</span>}
                                {i === 1 && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
