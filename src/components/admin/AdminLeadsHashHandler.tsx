"use client";

import { useEffect } from "react";
import { markLeadSeenInStorage } from "@/lib/admin/seen-leads-storage";

/** Scroll to `#lead-…` and mark that lead as seen when landing from overview. */
export function AdminLeadsHashHandler() {
    useEffect(() => {
        const hash = window.location.hash;
        const m = /^#lead-(.+)$/.exec(hash);
        if (!m) return;
        const id = m[1];
        markLeadSeenInStorage(id);
        const el = document.getElementById(`lead-${id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, []);

    return null;
}
