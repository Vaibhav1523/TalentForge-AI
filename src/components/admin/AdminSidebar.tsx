"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_LOGO_SRC } from "@/lib/site-brand";
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    UserCheck,
    Blocks,
    UsersRound,
    ArrowLeft,
    Settings,
    SearchCheck,
    Inbox,
} from "lucide-react";

const BASE_NAV = [
    { label: "Overview", icon: LayoutDashboard, href: "/admin" },
    { label: "Users", icon: Users, href: "/admin/users" },
    { label: "Candidate Search", icon: SearchCheck, href: "/admin/candidates" },
    { label: "Recruiters", icon: UserCheck, href: "/admin/recruiters" },
    { label: "Applications", icon: FileText, href: "/admin/applications" },
    { label: "Leads", icon: Inbox, href: "/admin/leads" },
    { label: "Jobs", icon: Briefcase, href: "/admin/jobs" },
    { label: "Cases", icon: Blocks, href: "/admin/cases" },
    { label: "Team", icon: UsersRound, href: "/admin/team" },
];

type Props = {
    isSuperAdmin?: boolean;
    /** Signed-in admin (session name or email local part). */
    userName: string;
    /** Shown under name (e.g. Super admin / Admin). */
    roleLabel: string;
};

export function AdminSidebar({ isSuperAdmin, userName, roleLabel }: Props) {
    const pathname = usePathname();

    const nav = isSuperAdmin
        ? [...BASE_NAV, { label: "Settings", icon: Settings, href: "/admin/settings" }]
        : BASE_NAV;

    const active =
        nav.filter(
            (item) =>
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href + "/"))
        ).sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/admin";

    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar-brand">
                <Link href="/admin" className="admin-sidebar-brand-link">
                    <img className="admin-sidebar-logo" src={SITE_LOGO_SRC} alt="" width={32} height={32} decoding="async" />
                    <span className="admin-sidebar-brand-text">
                        <span className="admin-sidebar-user-name" title={userName}>
                            {userName}
                        </span>
                        <span
                            className={`admin-sidebar-role-label ${isSuperAdmin ? "admin-sidebar-role-label--super" : "admin-sidebar-role-label--admin"}`}
                        >
                            {roleLabel}
                        </span>
                    </span>
                </Link>
            </div>
            <nav className="admin-sidebar-nav">
                {nav.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`admin-sidebar-link ${active === item.href ? "active" : ""}`}
                        aria-current={active === item.href ? "page" : undefined}
                    >
                        <item.icon size={16} strokeWidth={2} />
                        {item.label}
                    </Link>
                ))}
            </nav>
            <div className="admin-sidebar-foot">
                <Link href="/" className="admin-sidebar-link">
                    <ArrowLeft size={14} strokeWidth={2} />
                    Back to Site
                </Link>
            </div>
        </aside>
    );
}
