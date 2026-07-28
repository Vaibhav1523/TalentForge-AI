/** Two-line meet display for admin lead UIs (date + time). */
export function formatLeadMeetParts(d: Date | string | null | undefined): { dateLine: string; timeLine: string } | null {
    if (d == null) return null;
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    const dateLine = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
    const timeLine = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
    }).format(date);
    return { dateLine, timeLine };
}
