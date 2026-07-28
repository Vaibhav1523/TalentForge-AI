import Link from "next/link";
import { BookingStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { pickLeadMeetSummary, snippet } from "@/lib/admin/admin-data";
import { AdminLeadsTableBody } from "@/components/admin/AdminLeadsTableBody";
import { AdminLeadsHashHandler } from "@/components/admin/AdminLeadsHashHandler";

const PAGE_SIZE = 50;

function fmtDay(d: Date | null) {
    if (!d) return "—";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

type Props = { searchParams?: { page?: string } };

export default async function AdminLeadsPage({ searchParams }: Props) {
    const pageRaw = searchParams?.page;
    const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const [rows, total] = await Promise.all([
        prisma.lead.findMany({
            orderBy: { createdAt: "desc" },
            skip,
            take: PAGE_SIZE,
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
                phone: true,
                roles: true,
                createdAt: true,
                booking: {
                    where: { status: BookingStatus.CONFIRMED },
                    select: { scheduledAt: true, status: true },
                    orderBy: { scheduledAt: "asc" },
                },
            },
        }),
        prisma.lead.count(),
    ]);

    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const sp = (p: number) => (p <= 1 ? "/admin/leads" : `/admin/leads?page=${p}`);

    const tableRows = rows.map((lead) => {
        const { meetAt, meetKind } = pickLeadMeetSummary(lead.booking, now);
        const created = lead.createdAt ?? null;
        const isNew = created ? created.getTime() >= weekAgo.getTime() : false;
        return {
            id: lead.id,
            name: lead.name,
            email: lead.email,
            company: lead.company,
            phone: lead.phone ?? null,
            rolesSnippet: snippet(lead.roles),
            isNew,
            meetKind,
            meetAtIso: meetAt?.toISOString() ?? null,
            createdDayFormatted: fmtDay(created),
        };
    });

    return (
        <div className="page-shell">
            <div className="page-wrap">
                <section className="header-card">
                    <h1 className="header-title">Leads</h1>
                    <p className="header-subtitle">
                        Site form submissions. <strong>Meet</strong> uses confirmed Cal bookings (
                        <code>Booking.scheduledAt</code>) — date and time on separate lines.&nbsp;
                        <strong>New</strong> = created in the last 7 days and not opened on this browser; opening a row
                        (or this page from the overview link) clears the badge.
                    </p>
                </section>

                <section className="panel">
                    <div className="toolbar" style={{ marginBottom: 12 }}>
                        <h2 className="row-title" style={{ fontSize: 15 }}>
                            All leads
                        </h2>
                        <Link href="/admin" className="btn">
                            ← Overview
                        </Link>
                    </div>

                    {rows.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            No leads yet
                        </div>
                    ) : (
                        <div className="jobs-table-wrap" style={{ overflowX: "auto" }}>
                            <AdminLeadsHashHandler />
                            <table className="jobs-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Company</th>
                                        <th>Phone</th>
                                        <th>Note / roles</th>
                                        <th>Meet time</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <AdminLeadsTableBody rows={tableRows} />
                            </table>
                            <div
                                className="header-subtitle"
                                style={{
                                    marginTop: 16,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    gap: 12,
                                    fontSize: 12,
                                }}
                            >
                                <span>
                                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, total)} of{" "}
                                    {total}
                                </span>
                                {pageCount > 1 ? (
                                    <span style={{ display: "flex", gap: 8 }}>
                                        {safePage > 1 ? (
                                            <Link href={sp(safePage - 1)} className="btn">
                                                Previous
                                            </Link>
                                        ) : null}
                                        {safePage < pageCount ? (
                                            <Link href={sp(safePage + 1)} className="btn">
                                                Next
                                            </Link>
                                        ) : null}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
