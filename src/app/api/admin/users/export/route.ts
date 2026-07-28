import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/require-admin";
import {
    getAdminUsersExportRows,
    type AdminUsersRoleFilter,
} from "@/lib/admin/admin-data";

function parseStart(v: string | null): Date | null {
    if (!v?.trim()) return null;
    const d = new Date(`${v.trim()}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function parseEnd(v: string | null): Date | null {
    if (!v?.trim()) return null;
    const d = new Date(`${v.trim()}T23:59:59.999`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function fmt(d: Date | null) {
    if (!d) return "";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(d);
}

const ROLES = new Set<AdminUsersRoleFilter>(["ALL", "CANDIDATE", "RECRUITER"]);

export async function GET(req: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const roleRaw = (sp.get("role") ?? "CANDIDATE").toUpperCase();
    const role: AdminUsersRoleFilter = ROLES.has(roleRaw as AdminUsersRoleFilter)
        ? (roleRaw as AdminUsersRoleFilter)
        : "CANDIDATE";
    const q = sp.get("q") ?? "";
    const from = parseStart(sp.get("from"));
    const to = parseEnd(sp.get("to"));
    const recruiterId = (sp.get("recruiterId") ?? "").trim();
    const companyKey = (sp.get("companyKey") ?? "").trim();

    try {
        const users = await getAdminUsersExportRows({
            role,
            q,
            from,
            to,
            companyKey: companyKey || undefined,
            recruiterId: recruiterId || undefined,
            take: 20000,
        });
        const rows = users.map((u) => ({
            Role: u.userRole,
            Name: u.name,
            Email: u.email,
            City: u.city,
            Country: u.country,
            "Company name": u.companyName ?? "",
            Applications: u.applicationCount,
            Jobs: u.jobCount,
            Admin: u.isAdmin ? "Yes" : "No",
            Joined: fmt(u.createdAt),
            "User id": u.id,
        }));
        return NextResponse.json({ rows });
    } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        const stackPreview = e.stack?.split("\n").slice(0, 4).join(" ← ") ?? "";
        console.error("[admin/users/export]", {
            name: e.name,
            message: e.message,
            stackPreview: stackPreview.slice(0, 800),
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
