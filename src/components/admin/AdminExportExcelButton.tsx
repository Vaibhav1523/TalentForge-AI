"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

type Props = {
    label: string;
    endpoint: string;
    /** Query string without leading `?` */
    query: string;
    filenamePrefix: string;
    sheetName: string;
    /** Row object keys whose string values look like http(s) URLs become Excel hyperlinks (SheetJS `cell.l`). */
    hyperlinkColumnHeaders?: string[];
};

/**
 * Fetches JSON rows from an admin export API and downloads an .xlsx (same pattern as Candidate Search).
 */
function applyHyperlinksToSheet(
    XLSX: typeof import("xlsx"),
    ws: import("xlsx").WorkSheet,
    rows: Record<string, string | number | null | undefined>[],
    hyperlinkColumnHeaders: string[],
) {
    if (!hyperlinkColumnHeaders.length || !rows.length) return;
    const keys = Object.keys(rows[0] ?? {});
    const keyToCol = new Map(keys.map((k, i) => [k, i]));
    for (const header of hyperlinkColumnHeaders) {
        const col = keyToCol.get(header);
        if (col === undefined) continue;
        for (let r = 0; r < rows.length; r++) {
            const val = rows[r][header];
            const url = typeof val === "string" ? val.trim() : "";
            if (!url || !/^https?:\/\//i.test(url)) continue;
            const addr = XLSX.utils.encode_cell({ r: r + 1, c: col });
            const cell = ws[addr];
            if (!cell) continue;
            cell.l = { Target: url, Tooltip: "Open link" };
        }
    }
}

export function AdminExportExcelButton({
    label,
    endpoint,
    query,
    filenamePrefix,
    sheetName,
    hyperlinkColumnHeaders,
}: Props) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function handleClick() {
        setBusy(true);
        setError("");
        try {
            const url = query ? `${endpoint}?${query}` : endpoint;
            const res = await fetch(url);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Export failed (${res.status})`);
            }
            const data = await res.json();
            const rows = data.rows as Record<string, string | number | null | undefined>[];
            if (!Array.isArray(rows) || rows.length === 0) {
                setError("Nothing to export for the current filters.");
                return;
            }
            const XLSX = await import("xlsx");
            const ws = XLSX.utils.json_to_sheet(rows);
            if (hyperlinkColumnHeaders?.length) {
                applyHyperlinksToSheet(XLSX, ws, rows, hyperlinkColumnHeaders);
            }
            const keys = Object.keys(rows[0] ?? {});
            if (keys.length > 0) {
                ws["!cols"] = keys.map((key) => {
                    const maxLen = Math.max(
                        key.length,
                        ...rows.map((r) => String(r[key] ?? "").length),
                    );
                    return { wch: Math.min(maxLen + 2, 50) };
                });
            }
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Export");
            XLSX.writeFile(wb, `${filenamePrefix}-${Date.now()}.xlsx`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Export failed";
            setError(msg);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <button type="button" className="btn primary" disabled={busy} onClick={handleClick}>
                {busy ? <Loader2 size={14} className="spin-icon" /> : <Download size={14} />}
                {busy ? " Preparing…" : ` ${label}`}
            </button>
            {error ? (
                <span style={{ fontSize: 12, color: "var(--red)" }}>{error}</span>
            ) : null}
        </div>
    );
}
