/** Persist which leads the admin has opened (per browser). Used to hide the "New" badge after first view. */
export const ADMIN_SEEN_LEADS_STORAGE_KEY = "hookstep.admin.seenLeadIds";

export function readSeenLeadIds(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(ADMIN_SEEN_LEADS_STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw) as unknown;
        return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    } catch {
        return [];
    }
}

export function isLeadMarkedSeen(leadId: string): boolean {
    return readSeenLeadIds().includes(leadId);
}

export function markLeadSeenInStorage(leadId: string): void {
    if (typeof window === "undefined") return;
    const ids = new Set(readSeenLeadIds());
    ids.add(leadId);
    window.localStorage.setItem(ADMIN_SEEN_LEADS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}
