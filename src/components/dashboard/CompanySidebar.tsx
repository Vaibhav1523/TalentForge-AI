'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRecruiterBasePath } from '@/components/RecruiterBasePathContext';
import {
    LayoutDashboard,
    PlusCircle,
    Briefcase,
    Users,
    Video,
    Phone,
    BarChart,
    Settings,
    LogOut
} from 'lucide-react';
import { useSession } from "next-auth/react";
import { signOutFromHookstep } from "@/lib/sign-out-hookstep";
import { SITE_LOGO_SRC } from "@/lib/site-brand";
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type CompanySidebarProps = {
    /** From server: org / tenant for this `/c/:slug` route (fixes JWT vs URL for platform admins). */
    routeCompanyName?: string | null;
    routeCompanyLogoUrl?: string | null;
};

export default function CompanySidebar({
    routeCompanyName = null,
    routeCompanyLogoUrl = null,
}: CompanySidebarProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const base = useRecruiterBasePath();
    const showMobileThemeToggle = pathname ? pathname.endsWith('/settings') : false;
    const [mounted, setMounted] = useState(false);
    const customLogo =
        (routeCompanyLogoUrl?.trim() || session?.user?.companyLogoUrl?.trim() || "");
    const [logoFailed, setLogoFailed] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        setLogoFailed(false);
    }, [customLogo]);

    const companyName = (routeCompanyName?.trim() || session?.user?.companyName?.trim() || "");
    const brandTitle = companyName || "HookStep";
    const useCustomLogo = Boolean(customLogo) && !logoFailed;
    const brandIconSrc = useCustomLogo ? customLogo : SITE_LOGO_SRC;

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, href: base },
        { label: 'Post a Job', icon: PlusCircle, href: `${base}/jobs/new` },
        { label: 'Jobs', icon: Briefcase, href: `${base}/jobs` },
        { label: 'Candidates', icon: Users, href: `${base}/candidates` },
        { label: 'Interviews', icon: Video, href: `${base}/interviews` },
        { label: 'AI Calling', icon: Phone, href: `${base}/ai-calling` },
        { label: 'Analytics', icon: BarChart, href: `${base}/analytics` },
        { label: 'Settings', icon: Settings, href: `${base}/settings` },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="sidebar company-sidebar">
                <div className="sidebar-header">
                    <Link href={base} className="brand brand--company" title={companyName || "HookStep"}>
                        <img
                            className={`brand-icon${useCustomLogo ? " brand-icon--custom" : ""}`}
                            src={brandIconSrc}
                            alt=""
                            width={36}
                            height={36}
                            decoding="async"
                            onError={() => {
                                if (customLogo) setLogoFailed(true);
                            }}
                        />
                        <span className="brand-text">
                            <span className="brand-title">{brandTitle}</span>
                            {companyName ? (
                                <span className="brand-subtitle">HookStep</span>
                            ) : null}
                        </span>
                    </Link>
                </div>

                <nav className="sidebar-nav">
                    {(() => {
                        const activeHref = menuItems
                            .filter(item =>
                                pathname === item.href ||
                                (item.href !== base && pathname.startsWith(item.href + '/'))
                            )
                            .sort((a, b) => b.href.length - a.href.length)[0]?.href;

                        return menuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-item ${activeHref === item.href ? 'active' : ''}`}
                            >
                                <item.icon size={20} className="nav-icon" />
                                {item.label}
                            </Link>
                        ));
                    })()}

                    <div className="sidebar-settings-section">
                        <p className="sidebar-settings-title">Theme</p>
                        <ThemeToggle />
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button type="button" className="logout-btn" onClick={() => signOutFromHookstep(session ?? null, "/")}>
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Mobile theme toggle: only on recruiter Settings page */}
            {mounted && showMobileThemeToggle && (
                <div className="mobile-theme-toggle-shell">
                    <ThemeToggle />
                </div>
            )}

            {/* Mobile Bottom Navigation - Adapted for Company */}
            <nav className="mobile-bottom-nav">
                {(() => {
                    const mobileActiveHref = menuItems
                        .filter(item =>
                            pathname === item.href ||
                            (item.href !== base && pathname.startsWith(item.href + '/'))
                        )
                        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

                    return menuItems.slice(0, 4).map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`mobile-nav-item ${mobileActiveHref === item.href ? 'active' : ''}`}
                        >
                            <item.icon size={20} />
                            <span style={{ fontSize: '10px' }}>{item.label}</span>
                        </Link>
                    ));
                })()}

                <button
                    type="button"
                    className="mobile-nav-item"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => signOutFromHookstep(session ?? null, "/")}
                >
                    <LogOut size={20} />
                    <span style={{ fontSize: '10px' }}>Logout</span>
                </button>
            </nav>
        </>
    );
}
