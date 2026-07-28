"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CASE_BLOCKS_STORAGE_KEY,
  CaseBlock,
  DEFAULT_CASE_BLOCKS,
  sanitizeCaseBlocks,
} from "@/lib/case-blocks";

const FALLBACK_TEMPLATE: CaseBlock = {
  id: '',
  title: '',
  role: '',
  imageUrl: '',
  imageAlt: '',
  summary: '',
  details: '',
  highlight: '',
  fullStoryMatter: '',
  primaryLabel: 'Read More',
  primaryHref: '',
  reverse: false,
  fullStory: { headline: '', brand: '', summaryTitle: '', summaryBody: '', detailsTitle: '', detailsBody: '', matterTitle: '', matterBody: '', impactTitle: '', impactBody: '', mediaUrl: '', mediaAlt: '' },
};

function createNewBlock(index: number): CaseBlock {
  const template = DEFAULT_CASE_BLOCKS.length > 0
    ? DEFAULT_CASE_BLOCKS[DEFAULT_CASE_BLOCKS.length - 1]
    : FALLBACK_TEMPLATE;
  const id = `custom-${Date.now()}-${index + 1}`;
  return {
    ...template,
    id,
    title: `New Case ${index + 1}`,
    role: "Add role from admin panel",
    summary: "Add summary text in the admin panel and it will appear here.",
    details: "Add detailed description in the admin panel.",
    highlight: "Add highlight metric here.",
    fullStoryMatter: "Add complete full story matter in the admin panel.",
    primaryHref: `/cases/block/${id}`,
    reverse: index % 2 === 1,
  };
}

function reindexTitles(cards: CaseBlock[]) {
  return cards.map((card, index) => {
    if (!card.title.startsWith("New Case ")) return card;
    return { ...card, title: `New Case ${index + 1}` };
  });
}

export function CaseBlocksManager() {
  const [cards, setCards] = useState<CaseBlock[]>(DEFAULT_CASE_BLOCKS);
  const [status, setStatus] = useState("");
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CASE_BLOCKS_STORAGE_KEY);
      if (!raw) return;
      setCards(sanitizeCaseBlocks(JSON.parse(raw)));
    } catch {
      setCards(DEFAULT_CASE_BLOCKS);
    }
  }, []);

  function persist(next: CaseBlock[]) {
    window.localStorage.setItem(CASE_BLOCKS_STORAGE_KEY, JSON.stringify(next));
  }

  function openBlock(blockId: string) {
    router.push(`/admin/case-blocks/${encodeURIComponent(blockId)}`);
  }

  function deleteBlock(index: number) {
    if (cards.length <= 1) {
      setStatus("At least one block is required.");
      return;
    }
    const next = cards.filter((_, i) => i !== index);
    setCards(next);
    persist(next);
    setStatus("Block removed.");
  }

  function addBlock() {
    const next = reindexTitles([createNewBlock(cards.length), ...cards]);
    setCards(next);
    persist(next);
    setStatus("New block added at the top.");
    openBlock(next[0].id);
  }

  return (
    <section className="panel">
      {/* Header */}
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div>
          <div className="row-title">Manage Blocks</div>
          <div className="row-sub" style={{ marginTop: 2 }}>{cards.length} case {cards.length === 1 ? "study" : "studies"} configured</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="btn primary" onClick={addBlock}>+ Add Block</button>
          <Link href="/cases" className="btn" target="_blank">View Live ↗</Link>
        </div>
      </div>

      {/* Block list */}
      <div className="list">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="case-block-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
              transition: "all var(--transition)",
            }}
          >
            {/* Number badge */}
            <div
              className="leaderboard-rank"
              style={{ width: 28, height: 28, fontSize: 12 }}
            >
              {index + 1}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{card.title}</div>
              <div className="row-sub">{card.role}</div>
            </div>

            {/* Preview of content */}
            <div className="muted" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, display: "none" }}>
              {(card.summary?.length ?? 0) > 60 ? card.summary.slice(0, 60) + '…' : card.summary ?? ''}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button type="button" className="btn primary" onClick={() => openBlock(card.id)} style={{ padding: "5px 12px", fontSize: 12 }}>
                Edit
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => deleteBlock(index)}
                style={{ padding: "5px 12px", fontSize: 12, color: "var(--red)", borderColor: "rgba(247,110,138,0.18)" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {status && (
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <span className="badge status-active no-dot" style={{ fontSize: 11 }}>
            {status}
          </span>
        </div>
      )}
    </section>
  );
}
