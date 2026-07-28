"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type EditField = {
    key: string;
    label: string;
} & (
    | { type: "text"; value: string }
    | { type: "select"; value: string; options: { value: string; label: string }[] }
    | { type: "checkbox"; value: boolean }
);

type Props = {
    recordType: "user" | "job" | "application";
    recordId: string;
    recordLabel: string;
    editFields?: EditField[];
    editHref?: string;
};

export function AdminRecordActions({ recordType, recordId, recordLabel, editFields, editHref }: Props) {
    const router = useRouter();
    const [showEdit, setShowEdit] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [fields, setFields] = useState<EditField[]>(editFields ?? []);
    useEffect(() => { setFields(editFields ?? []); }, [editFields]);

    function updateField(key: string, value: string | boolean) {
        setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value } as EditField : f)));
    }

    async function handleSave() {
        setSaving(true);
        setFeedback("");
        try {
            const payload: Record<string, unknown> = { type: recordType, id: recordId };
            for (const f of fields) payload[f.key] = f.value;
            const res = await fetch("/api/admin/records", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const b = await res.json().catch(() => ({}));
                setFeedback(b.error ?? "Save failed");
                return;
            }
            setShowEdit(false);
            router.refresh();
        } catch {
            setFeedback("Save failed");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm(`Permanently delete ${recordLabel}? This cannot be undone.`)) return;
        setDeleting(true);
        setFeedback("");
        try {
            const res = await fetch("/api/admin/records", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: recordType, id: recordId }),
            });
            if (!res.ok) {
                const b = await res.json().catch(() => ({}));
                setFeedback(b.error ?? "Delete failed");
                return;
            }
            router.refresh();
        } catch {
            setFeedback("Delete failed");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {editHref && (
                    <a href={editHref} className="btn" style={{ padding: "4px 10px", fontSize: 11, textDecoration: "none" }}>
                        Edit
                    </a>
                )}
                {editFields && editFields.length > 0 && !editHref && (
                    <button
                        type="button"
                        className="btn"
                        onClick={() => { setShowEdit(!showEdit); setFeedback(""); }}
                        style={{ padding: "4px 10px", fontSize: 11 }}
                    >
                        {showEdit ? "Cancel" : "Edit"}
                    </button>
                )}
                {editFields && editFields.length > 0 && editHref && (
                    <button
                        type="button"
                        className="btn"
                        onClick={() => { setShowEdit(!showEdit); setFeedback(""); }}
                        style={{ padding: "4px 10px", fontSize: 11 }}
                    >
                        {showEdit ? "Cancel" : "Status"}
                    </button>
                )}
                <button
                    type="button"
                    className="btn"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{ padding: "4px 10px", fontSize: 11, color: "var(--red)", borderColor: "rgba(247,110,138,0.18)" }}
                >
                    {deleting ? "…" : "Delete"}
                </button>
            </div>

            {showEdit && (
                <div style={{
                    gridColumn: "1 / -1",
                    padding: 12,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(255,255,255,0.02)",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "end",
                    marginTop: 6,
                }}>
                    {fields.map((f) => {
                        const fieldId = `filter-${f.key}`;
                        return (
                        <div key={f.key} className="filter-field" style={{ minWidth: 120, flex: 1 }}>
                            <label htmlFor={fieldId} className="filter-label">{f.label}</label>
                            {f.type === "select" ? (
                                <select
                                    id={fieldId}
                                    className="control-input"
                                    value={f.value as string}
                                    onChange={(e) => updateField(f.key, e.target.value)}
                                >
                                    {f.options.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            ) : f.type === "checkbox" ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
                                    <input
                                        id={fieldId}
                                        type="checkbox"
                                        checked={f.value as boolean}
                                        onChange={(e) => updateField(f.key, e.target.checked)}
                                        style={{ width: 16, height: 16, accentColor: "var(--cyan)", cursor: "pointer" }}
                                    />
                                    <span style={{ fontSize: 12, color: "var(--ink-secondary)" }}>{f.value ? "Yes" : "No"}</span>
                                </div>
                            ) : (
                                <input
                                    id={fieldId}
                                    className="control-input"
                                    value={f.value as string}
                                    onChange={(e) => updateField(f.key, e.target.value)}
                                />
                            )}
                        </div>
                        );
                    })}
                    <button type="button" className="btn primary" onClick={handleSave} disabled={saving} style={{ padding: "8px 16px", fontSize: 12 }}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                    {feedback && <span style={{ fontSize: 11, color: "var(--red)" }}>{feedback}</span>}
                </div>
            )}
        </>
    );
}
