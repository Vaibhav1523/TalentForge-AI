"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Clock, Briefcase, Building2 } from "lucide-react";
import { CASE_BLOCKS_STORAGE_KEY, CaseBlock, DEFAULT_CASE_BLOCKS, sanitizeCaseBlocks } from "@/lib/case-blocks";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "summary", label: "Client Requirements" },
  { id: "details", label: "Solution & Process" },
  { id: "full-story", label: "Full Story" },
  { id: "impact", label: "Results & Impact" },
  { id: "screens", label: "Screenshots" },
] as const;

type Props = {
  blockId: string;
};

export function CaseBlockFullStory({ blockId }: Props) {
  const [cards, setCards] = useState<CaseBlock[]>(DEFAULT_CASE_BLOCKS);
  const [activeSection, setActiveSection] = useState<(typeof NAV_ITEMS)[number]["id"]>("overview");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CASE_BLOCKS_STORAGE_KEY);
      if (!raw) return;
      setCards(sanitizeCaseBlocks(JSON.parse(raw)));
    } catch {
      setCards(DEFAULT_CASE_BLOCKS);
    }
  }, []);

  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((item) => item.id);
    const lastSectionId = sectionIds[sectionIds.length - 1];
    let raf = 0;

    const updateActiveSection = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
      if (nearBottom) {
        setActiveSection(lastSectionId as (typeof NAV_ITEMS)[number]["id"]);
        return;
      }

      const anchorY = window.scrollY + 180;
      let current = sectionIds[0];

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (anchorY >= el.offsetTop) current = id;
      }

      setActiveSection(current as (typeof NAV_ITEMS)[number]["id"]);
    };

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateActiveSection);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [cards, blockId]);

  const block = cards.find((item) => item.id === blockId) ?? DEFAULT_CASE_BLOCKS.find((item) => item.id === blockId);
  const summaryBody = block?.fullStory.summaryBody?.trim() || block?.summary?.trim() || "";
  const detailsBody = block?.fullStory.detailsBody?.trim() || block?.details?.trim() || "";
  const matterBody =
    block?.fullStory.matterBody?.trim() ||
    block?.fullStoryMatter?.trim() ||
    detailsBody ||
    "Full story matter has not been added yet.";
  const impactBody = block?.fullStory.impactBody?.trim() || block?.highlight?.trim() || "";

  if (!block) {
    return (
      <section className="case-detail-page" aria-label="Case story not found">
        <div className="case-detail-wrap">
          <section className="case-detail-main">
            <h1>Case not found</h1>
            <p style={{ color: "rgba(200,220,240,0.7)", marginTop: 12 }}>
              The selected case study does not exist.
            </p>
            <div className="case-detail-actions" style={{ marginTop: 24 }}>
              <Link href="/cases" className="case-detail-btn case-detail-btn--primary">
                Back to Cases <ArrowUpRight size={16} />
              </Link>
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="case-detail-page" aria-label={`${block.title} full story`}>
      <div className="case-detail-wrap">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="case-detail-side">
          <Link href="/cases" className="case-detail-back">
            <span className="case-detail-back-icon" aria-hidden="true">
              <ArrowLeft size={20} />
            </span>
            Back to all
          </Link>

          <nav className="case-detail-nav" aria-label="Case sections">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`case-detail-nav-link${activeSection === item.id ? " is-active" : ""}`}
              >
                <span className="case-detail-nav-dot" />
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* ── Main ─────────────────────────────────────────────────── */}
        <section className="case-detail-main">
          <section id="overview">
            <div className="case-detail-breadcrumb">
              <Link href="/cases">Case Studies</Link>
              <span className="case-detail-breadcrumb-sep">/</span>
              <span>{block.fullStory.brand}</span>
            </div>

            <h1 className="case-detail-headline">{block.fullStory.headline}</h1>

            <div className="case-detail-hero-bar">
              <span className="case-detail-brand-badge">
                <Building2 size={16} />
                {block.fullStory.brand}
              </span>
              <Link className="case-detail-btn" href="/cases">
                All Cases <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="case-detail-stats">
              <div className="case-detail-stat">
                <div className="case-detail-stat-icon">
                  <Briefcase size={18} />
                </div>
                <div>
                  <span className="case-detail-stat-label">Role</span>
                  <span className="case-detail-stat-value">{block.role}</span>
                </div>
              </div>
              <div className="case-detail-stat">
                <div className="case-detail-stat-icon">
                  <Building2 size={18} />
                </div>
                <div>
                  <span className="case-detail-stat-label">Client</span>
                  <span className="case-detail-stat-value">{block.title}</span>
                </div>
              </div>
              <div className="case-detail-stat case-detail-stat--accent">
                <div className="case-detail-stat-icon">
                  <Clock size={18} />
                </div>
                <div>
                  <span className="case-detail-stat-label">Key Result</span>
                  <span className="case-detail-stat-value">{block.highlight}</span>
                </div>
              </div>
            </div>

            <article className="case-detail-hero-panel">
              <img
                className="case-detail-hero-img"
                src={block.fullStory.mediaUrl}
                alt={block.fullStory.mediaAlt}
                loading="eager"
              />
            </article>
          </section>

          {/* ── Sections ──────────────────────────────────────────── */}
          <section className="case-detail-section" id="summary">
            <div className="case-detail-section-grid">
              <div className="case-detail-section-header">
                <span className="case-detail-section-num">01</span>
                <h2>{block.fullStory.summaryTitle}</h2>
              </div>
              <div className="case-detail-section-copy">
                <p>{summaryBody}</p>
              </div>
            </div>
          </section>

          <section className="case-detail-section" id="details">
            <div className="case-detail-section-grid">
              <div className="case-detail-section-header">
                <span className="case-detail-section-num">02</span>
                <h2>{block.fullStory.detailsTitle}</h2>
              </div>
              <div className="case-detail-section-copy">
                <p>{detailsBody}</p>
              </div>
            </div>
          </section>

          <section className="case-detail-section" id="full-story">
            <div className="case-detail-section-grid">
              <div className="case-detail-section-header">
                <span className="case-detail-section-num">03</span>
                <h2>{block.fullStory.matterTitle}</h2>
              </div>
              <div className="case-detail-section-copy">
                <p style={{ whiteSpace: "pre-wrap" }}>{matterBody}</p>
              </div>
            </div>
          </section>

          <section className="case-detail-section" id="impact">
            <div className="case-detail-section-grid">
              <div className="case-detail-section-header">
                <span className="case-detail-section-num">04</span>
                <h2>{block.fullStory.impactTitle}</h2>
              </div>
              <div className="case-detail-section-copy">
                <p>{impactBody}</p>
              </div>
            </div>
          </section>

          {/* ── Screenshots ──────────────────────────────────────── */}
          <article className="case-detail-media-panel" id="screens">
            <div className="case-detail-media-label">
              <span className="case-detail-section-num">05</span>
              Screenshots
            </div>
            <img
              className="case-detail-hero-img"
              src={block.fullStory.mediaUrl}
              alt={block.fullStory.mediaAlt}
              loading="eager"
            />
          </article>

          <div className="case-detail-cta-footer">
            <p>Interested in similar results for your team?</p>
            <Link href="/cases" className="case-detail-btn case-detail-btn--primary">
              View All Case Studies <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="case-detail-end-sentinel" aria-hidden="true" />
        </section>
      </div>
    </section>
  );
}
