"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { CASE_BLOCKS_STORAGE_KEY, DEFAULT_CASE_BLOCKS, sanitizeCaseBlocks } from "@/lib/case-blocks";

function isInternalLink(href: string) {
  return href.startsWith("/");
}

function resolveStoryHref(id: string, href: string) {
  const trimmed = href.trim();
  if (!trimmed) return `/cases/block/${encodeURIComponent(id)}`;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/cases/block/")) return trimmed;
  return `/cases/block/${encodeURIComponent(id)}`;
}

function ActionLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) {
  if (isInternalLink(href)) {
    return (
      <Link className={className} href={href}>
        {label} <ArrowUpRight size={16} />
      </Link>
    );
  }

  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {label} <ArrowUpRight size={16} />
    </a>
  );
}

export function CasePageCards() {
  const [cards, setCards] = useState(DEFAULT_CASE_BLOCKS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CASE_BLOCKS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setCards(sanitizeCaseBlocks(parsed));
    } catch {
      setCards(DEFAULT_CASE_BLOCKS);
    }
  }, []);

  return (
    <div className="case-page-stack">
      {cards.map((card, index) => {
        // Always route case cards to a valid full-story page unless an external URL is explicitly set.
        const storyHref = resolveStoryHref(card.id, card.primaryHref);
        return (
        <article
          key={card.id}
          className={`case-page-panel ${card.reverse ? "is-reverse" : ""}`}
          aria-label={`${card.title} case`}
        >
          <div className="case-page-grid">
            <div className="case-page-media">
              <img className="case-page-photo" src={card.imageUrl} alt={card.imageAlt} loading="lazy" />
              <div className="case-page-media-scrim" aria-hidden="true" />
            </div>

            <div className="case-page-copy">
              <h2>{card.title}</h2>
              <p className="case-page-role">{card.role}</p>
              <p>{card.summary}</p>
              <p>{card.details}</p>
              <p className="case-page-highlight">{card.highlight}</p>

              <div className="case-page-actions">
                <ActionLink className="case-page-btn primary" href={storyHref} label={card.primaryLabel} />
              </div>
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}
