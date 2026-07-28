"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { markLeadSeenInStorage, isLeadMarkedSeen } from "@/lib/admin/seen-leads-storage";
import { formatLeadMeetParts } from "@/lib/admin/lead-format";

export type AdminLeadsTableRowSerialized = {
    id: string;
    name: string;
    email: string;
    company: string;
    phone: string | null;
    rolesSnippet: string | null;
    isNew: boolean;
    meetKind: "upcoming" | "past" | "none";
    meetAtIso: string | null;
    createdDayFormatted: string;
};

function LeadRow({ row }: { row: AdminLeadsTableRowSerialized }) {
    const [seen, setSeen] = useState(false);

    useEffect(() => {
        if (isLeadMarkedSeen(row.id)) setSeen(true);
    }, [row.id]);

    const showNew = row.isNew && !seen;
    const meetParts = row.meetAtIso ? formatLeadMeetParts(row.meetAtIso) : null;

    const onRowClick = useCallback(() => {
        markLeadSeenInStorage(row.id);
        setSeen(true);
    }, [row.id]);

    return (
        <tr id={`lead-${row.id}`} className="admin-lead-table-row" onClick={onRowClick}>
            <td style={{ fontWeight: 600 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 22, display: "inline-flex", justifyContent: "center", flexShrink: 0 }}>
                        {showNew ? (
                            <Sparkles size={16} strokeWidth={2.2} className="admin-lead-new-icon" aria-hidden />
                        ) : null}
                    </span>
                    <span>{row.name}</span>
                    {showNew ? (
                        <span className="badge status-active no-dot" style={{ fontSize: 10 }}>
                            New
                        </span>
                    ) : null}
                </span>
            </td>
            <td>{row.email}</td>
            <td>{row.company}</td>
            <td>{row.phone ?? "—"}</td>
            <td className="row-sub" style={{ maxWidth: 220 }}>
                {row.rolesSnippet ?? "—"}
            </td>
            <td>
                {row.meetKind === "none" ? (
                    <span style={{ color: "var(--muted)" }}>No booking</span>
                ) : meetParts ? (
                    <>
                        <div style={{ fontWeight: 600 }}>{meetParts.dateLine}</div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>{meetParts.timeLine}</div>
                        <div className="row-sub" style={{ marginTop: 4 }}>
                            {row.meetKind === "upcoming" ? "Upcoming" : "Last scheduled"}
                        </div>
                    </>
                ) : null}
            </td>
            <td>{row.createdDayFormatted}</td>
        </tr>
    );
}

export function AdminLeadsTableBody({ rows }: { rows: AdminLeadsTableRowSerialized[] }) {
    return (
        <tbody>
            {rows.map((row) => (
                <LeadRow key={row.id} row={row} />
            ))}
        </tbody>
    );
}
