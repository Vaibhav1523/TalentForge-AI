"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CASE_BLOCKS_STORAGE_KEY,
  CaseBlock,
  CaseBlockFullStory,
  DEFAULT_CASE_BLOCKS,
  sanitizeCaseBlocks,
} from "@/lib/case-blocks";

function updateCard(cards: CaseBlock[], index: number, key: keyof CaseBlock, value: string | boolean) {
  const next = [...cards];
  const current = next[index];
  if (!current) return next;
  if (key === "fullStoryMatter" && typeof value === "string") {
    next[index] = { ...current, fullStoryMatter: value, fullStory: { ...current.fullStory, matterBody: value } };
    return next;
  }
  next[index] = { ...current, [key]: value };
  return next;
}

function updateFullStoryField(cards: CaseBlock[], index: number, key: keyof CaseBlockFullStory, value: string) {
  const next = [...cards];
  const current = next[index];
  if (!current) return next;
  if (key === "matterBody") {
    next[index] = { ...current, fullStoryMatter: value, fullStory: { ...current.fullStory, matterBody: value } };
    return next;
  }
  next[index] = { ...current, fullStory: { ...current.fullStory, [key]: value } };
  return next;
}

type Props = { blockId: string };

export function CaseBlockEditor({ blockId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [cards, setCards] = useState<CaseBlock[]>(DEFAULT_CASE_BLOCKS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CASE_BLOCKS_STORAGE_KEY);
      if (!raw) return;
      setCards(sanitizeCaseBlocks(JSON.parse(raw)));
    } catch {
      setCards(DEFAULT_CASE_BLOCKS);
    }
  }, []);

  const index = useMemo(() => cards.findIndex((c) => c.id === blockId), [cards, blockId]);
  const card = index >= 0 ? cards[index] : null;

  function persist(next: CaseBlock[]) {
    setCards(next);
    window.localStorage.setItem(CASE_BLOCKS_STORAGE_KEY, JSON.stringify(next));
  }

  function onChange(key: keyof CaseBlock, value: string | boolean) {
    if (index < 0) return;
    persist(updateCard(cards, index, key, value));
  }

  function onFullStoryChange(key: keyof CaseBlockFullStory, value: string) {
    if (index < 0) return;
    persist(updateFullStoryField(cards, index, key, value));
  }

  function deleteCurrentBlock() {
    if (index < 0) return;
    if (cards.length <= 1) { setStatus("At least one block is required."); return; }
    persist(cards.filter((_, i) => i !== index));
    router.push("/admin/cases");
  }

  if (!card) {
    return (
      <section className="panel">
        <div className="toolbar">
          <div className="row-title">Block Not Found</div>
          <Link href="/admin/cases" className="btn">← Back to Cases</Link>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          This block does not exist. It may have been deleted.
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Header card */}
      <section className="header-card">
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div className="leaderboard-rank" style={{ width: 32, height: 32, fontSize: 14 }}>{index + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="header-title" style={{ fontSize: 22 }}>{card.title}</h1>
            <p className="header-subtitle" style={{ marginTop: 2 }}>{card.role}</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link href="/admin/cases" className="btn">← Cases</Link>
            <Link href="/cases" className="btn" target="_blank">View Live ↗</Link>
            <Link href={card.primaryHref} className="btn" target="_blank">Full Story ↗</Link>
          </div>
        </div>
      </section>

      {/* Card fields */}
      <section className="panel">
        <div className="toolbar">
          <div className="row-title">Card Content</div>
          <div className="row-sub">Controls the case study card shown on the /cases page</div>
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Field label="Title" value={card.title} onChange={(v) => onChange("title", v)} />
          <Field label="Role" value={card.role} onChange={(v) => onChange("role", v)} />
          <Field label="Image URL" value={card.imageUrl} onChange={(v) => onChange("imageUrl", v)} />
          <Field label="Image Alt" value={card.imageAlt} onChange={(v) => onChange("imageAlt", v)} />
          <Field label="Summary" value={card.summary} onChange={(v) => onChange("summary", v)} rows={3} full />
          <Field label="Details" value={card.details} onChange={(v) => onChange("details", v)} rows={4} full />
          <Field label="Full Story Matter" value={card.fullStoryMatter} onChange={(v) => onChange("fullStoryMatter", v)} rows={6} full />
          <Field label="Highlight Metric" value={card.highlight} onChange={(v) => onChange("highlight", v)} />
          <Field label="Button Label" value={card.primaryLabel} onChange={(v) => onChange("primaryLabel", v)} />
          <Field label="Button URL (Full Story)" value={card.primaryHref} onChange={(v) => onChange("primaryHref", v)} full />

          <div className="filter-field" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label className="filter-label" style={{ marginBottom: 0 }}>Reverse Layout</label>
            <input
              type="checkbox"
              checked={card.reverse}
              onChange={(e) => onChange("reverse", e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--cyan)", cursor: "pointer" }}
            />
          </div>
        </div>
      </section>

      {/* Full story fields */}
      <section className="panel">
        <div className="toolbar">
          <div className="row-title">Full Story Content</div>
          <div className="row-sub">Controls the detailed /cases/block/... full story page</div>
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Field label="Headline" value={card.fullStory.headline} onChange={(v) => onFullStoryChange("headline", v)} full />
          <Field label="Brand" value={card.fullStory.brand} onChange={(v) => onFullStoryChange("brand", v)} />
          <Field label="Summary Title" value={card.fullStory.summaryTitle} onChange={(v) => onFullStoryChange("summaryTitle", v)} />
          <Field label="Summary Body" value={card.fullStory.summaryBody} onChange={(v) => onFullStoryChange("summaryBody", v)} rows={4} full />
          <Field label="Details Title" value={card.fullStory.detailsTitle} onChange={(v) => onFullStoryChange("detailsTitle", v)} />
          <Field label="Matter Title" value={card.fullStory.matterTitle} onChange={(v) => onFullStoryChange("matterTitle", v)} />
          <Field label="Details Body" value={card.fullStory.detailsBody} onChange={(v) => onFullStoryChange("detailsBody", v)} rows={4} full />
          <Field label="Matter Body" value={card.fullStory.matterBody} onChange={(v) => onFullStoryChange("matterBody", v)} rows={5} full />
          <Field label="Impact Title" value={card.fullStory.impactTitle} onChange={(v) => onFullStoryChange("impactTitle", v)} />
          <Field label="Impact Body" value={card.fullStory.impactBody} onChange={(v) => onFullStoryChange("impactBody", v)} rows={4} full />
          <Field label="Media URL" value={card.fullStory.mediaUrl} onChange={(v) => onFullStoryChange("mediaUrl", v)} />
          <Field label="Media Alt" value={card.fullStory.mediaAlt} onChange={(v) => onFullStoryChange("mediaAlt", v)} />
        </div>
      </section>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn primary"
          onClick={() => setStatus("Saved.")}
          style={{ padding: "9px 20px" }}
        >
          Save Block
        </button>
        <button
          type="button"
          className="btn"
          onClick={deleteCurrentBlock}
          style={{ color: "var(--red)", borderColor: "rgba(247,110,138,0.18)" }}
        >
          Delete This Block
        </button>
        {status && (
          <span className="badge status-active no-dot" style={{ marginLeft: "auto", fontSize: 11 }}>{status}</span>
        )}
      </div>
    </>
  );
}

function Field({ label, value, onChange, rows, full }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  full?: boolean;
}) {
  return (
    <div className="filter-field" style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label className="filter-label">{label}</label>
      {rows ? (
        <textarea
          className="control-input"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ resize: "vertical" }}
        />
      ) : (
        <input className="control-input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
