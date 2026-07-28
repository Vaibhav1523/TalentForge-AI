/** Same choices as Candidate Search — keep admin tables consistent */
export const ADMIN_TABLE_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

export function parseAdminTablePageSize(raw: string | undefined, defaultSize: number): number {
    const n = Number.parseInt(String(raw ?? ""), 10);
    if (!Number.isFinite(n)) return defaultSize;
    if ((ADMIN_TABLE_PAGE_SIZE_OPTIONS as readonly number[]).includes(n)) return n;
    return defaultSize;
}

export function appendPageSizeParam(
    sp: URLSearchParams,
    pageSize: number,
    defaultPageSize: number,
): void {
    if (pageSize !== defaultPageSize) sp.set("pageSize", String(pageSize));
}
