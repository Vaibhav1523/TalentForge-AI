'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, FileText, User, LogOut } from 'lucide-react';
import { useSession } from "next-auth/react";
import { signOutFromHookstep } from "@/lib/sign-out-hookstep";
import { SITE_LOGO_SRC } from "@/lib/site-brand";
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const menuItems = [
    { label: 'Jobs', icon: Briefcase, href: '/dashboard/jobs' },
    { label: 'Applications', icon: FileText, href: '/dashboard/applications' },
    { label: 'Profile', icon: User, href: '/dashboard/profile' },
];

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const showMobileThemeToggle = pathname === '/dashboard/profile';
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <Link href="/dashboard" className="brand">
                        <img
                            className="brand-icon"
                            src={SITE_LOGO_SRC}
                            alt=""
                            width={36}
                            height={36}
                            decoding="async"
                        />
                        HookStep
                    </Link>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => {
                        const isActive = pathname ? pathname.startsWith(item.href) : false;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                                <item.icon size={20} className="nav-icon" />
                                {item.label}
                            </Link>
                        );
                    })}

                    <div className="sidebar-settings-section">
                        <p className="sidebar-settings-title">Theme</p>
                        <ThemeToggle />
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button type="button" className="logout-btn" onClick={() => signOutFromHookstep(session ?? null, "/sign-in")}>
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Mobile theme toggle: only on user Profile page */}
            {mounted && showMobileThemeToggle && (
                <div className="mobile-theme-toggle-shell">
                    <ThemeToggle />
                </div>
            )}

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav">
                {menuItems.map((item) => {
                    const isActive = pathname ? pathname.startsWith(item.href) : false;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <item.icon />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}

                <button
                    type="button"
                    className="mobile-nav-item"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => signOutFromHookstep(session ?? null, "/sign-in")}
                >
                    <LogOut />
                    <span>Logout</span>
                </button>
            </nav>
        </>
    );
}
