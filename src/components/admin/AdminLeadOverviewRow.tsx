"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { markLeadSeenInStorage, isLeadMarkedSeen } from "@/lib/admin/seen-leads-storage";
import { formatLeadMeetParts } from "@/lib/admin/lead-format";

export type AdminLeadOverviewRowLead = {
    id: string;
    name: string;
    email: string;
    company: string;
    meetKind: "upcoming" | "past" | "none";
    isNew: boolean;
    meetAtIso: string | null;
    createdRelative: string;
};

export function AdminLeadOverviewRow({ lead }: { lead: AdminLeadOverviewRowLead }) {
    const [seen, setSeen] = useState(false);

    useEffect(() => {
        if (isLeadMarkedSeen(lead.id)) setSeen(true);
    }, [lead.id]);

    const showNew = lead.isNew && !seen;
    const meetParts = lead.meetAtIso ? formatLeadMeetParts(lead.meetAtIso) : null;

    const onOpen = useCallback(() => {
        markLeadSeenInStorage(lead.id);
        setSeen(true);
    }, [lead.id]);

    return (
        <Link
            href={`/admin/leads#lead-${lead.id}`}
            className="overview-row admin-lead-overview-row"
            onClick={onOpen}
        >
            <div className="user-cell" style={{ flex: 1, minWidth: 0 }}>
                <div className="user-cell-info" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    {showNew ? (
                        <Sparkles
                            size={18}
                            strokeWidth={2.2}
                            className="admin-lead-new-icon"
                            aria-hidden
                        />
                    ) : (
                        <span style={{ width: 18, flexShrink: 0 }} aria-hidden />
                    )}
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{lead.name}</span>
                            {showNew ? (
                                <span className="badge status-active no-dot" style={{ fontSize: 10 }}>
                                    New
                                </span>
                            ) : null}
                        </div>
                        <div className="row-sub">{lead.email}</div>
                        <div className="row-sub" style={{ marginTop: 2 }}>
                            {lead.company}
                        </div>
                    </div>
                </div>
            </div>
            <div style={{ flex: "0 0 220px", textAlign: "right" as const }}>
                {lead.meetKind === "upcoming" && lead.meetAtIso ? (
                    <span className="badge status-draft no-dot" style={{ fontSize: 10, marginRight: 0 }}>
                        Meet scheduled
                    </span>
                ) : null}
                <div className="row-sub" style={{ marginTop: 6 }}>
                    {lead.meetKind === "none" ? (
                        <span style={{ color: "var(--muted)" }}>No booking</span>
                    ) : meetParts ? (
                        <>
                            <div style={{ fontWeight: 600 }}>{meetParts.dateLine}</div>
                            <div style={{ fontWeight: 600, marginTop: 2 }}>{meetParts.timeLine}</div>
                            <div className="row-sub" style={{ marginTop: 4 }}>
                                {lead.meetKind === "upcoming" ? "Upcoming" : "Last call"}
                            </div>
                        </>
                    ) : null}
                </div>
                <div className="row-sub" style={{ marginTop: 8 }}>
                    {lead.createdRelative}
                </div>
            </div>
        </Link>
    );
}
