"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Clock, Briefcase, Building2, MapPin, Calendar, Shield } from "lucide-react";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "Client Requirements" },
  { id: "process", label: "Solution & Process" },
  { id: "impact", label: "Results & Impact" },
  { id: "beyond", label: "Beyond Recruitment" },
  { id: "screens", label: "Screenshots" },
] as const;

export function FearsoffCaseContent() {
  const [activeSection, setActiveSection] = useState<(typeof NAV_ITEMS)[number]["id"]>("overview");

  const observerThresholds = useMemo(() => [0.05, 0.2, 0.35, 0.5], []);

  useEffect(() => {
    const sectionElements = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      Boolean,
    ) as HTMLElement[];
    if (!sectionElements.length) return;
    const lastSectionId = NAV_ITEMS[NAV_ITEMS.length - 1].id;

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const lastSectionVisible = entries.some(
          (entry) => entry.isIntersecting && entry.target.id === lastSectionId,
        );
        if (lastSectionVisible) {
          setActiveSection(lastSectionId);
          return;
        }

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveSection(visible.target.id as (typeof NAV_ITEMS)[number]["id"]);
        }
      },
      {
        threshold: observerThresholds,
        rootMargin: "-10% 0px -10% 0px",
      },
    );

    sectionElements.forEach((section) => sectionObserver.observe(section));

    return () => sectionObserver.disconnect();
  }, [observerThresholds]);

  useEffect(() => {
    const lastSectionId = NAV_ITEMS[NAV_ITEMS.length - 1].id;
    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      if (nearBottom) {
        setActiveSection(lastSectionId);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="case-detail-wrap">
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

      <section className="case-detail-main">
        <section id="overview">
          <div className="case-detail-breadcrumb">
            <Link href="/cases">Case Studies</Link>
            <span className="case-detail-breadcrumb-sep">/</span>
            <span>FearsOff</span>
          </div>

          <h1 className="case-detail-headline">Senior Smart Contract Auditor for FearsOff</h1>

          <div className="case-detail-hero-bar">
            <span className="case-detail-brand-badge">
              <Building2 size={16} />
              FearsOff
            </span>
          </div>

          <div className="case-detail-stats">
            <div className="case-detail-stat">
              <div className="case-detail-stat-icon"><Briefcase size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Role</span>
                <span className="case-detail-stat-value">Senior Smart Contract Auditor</span>
              </div>
            </div>
            <div className="case-detail-stat">
              <div className="case-detail-stat-icon"><MapPin size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Location</span>
                <span className="case-detail-stat-value">Remote (EU + MENA)</span>
              </div>
            </div>
            <div className="case-detail-stat case-detail-stat--accent">
              <div className="case-detail-stat-icon"><Clock size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Filled in</span>
                <span className="case-detail-stat-value">21 days</span>
              </div>
            </div>
          </div>

          <div className="case-detail-stats">
            <div className="case-detail-stat">
              <div className="case-detail-stat-icon"><Shield size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Urgency</span>
                <span className="case-detail-stat-value">High</span>
              </div>
            </div>
            <div className="case-detail-stat">
              <div className="case-detail-stat-icon"><Calendar size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Date</span>
                <span className="case-detail-stat-value">Dec 12, 2024</span>
              </div>
            </div>
            <div className="case-detail-stat">
              <div className="case-detail-stat-icon"><Briefcase size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Compensation</span>
                <span className="case-detail-stat-value">Confidential</span>
              </div>
            </div>
          </div>

          <article className="case-detail-hero-panel">
            <img
              className="case-detail-hero-img"
              src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=88"
              alt="Technical team working on smart contract auditing"
              loading="eager"
            />
          </article>
        </section>

        <section className="case-detail-section" id="requirements">
          <div className="case-detail-section-grid">
            <div className="case-detail-section-header">
              <span className="case-detail-section-num">01</span>
              <h2>Client Requirements</h2>
            </div>
            <div className="case-detail-section-copy">
              <p>
                FearsOff required a senior auditor who could review complex smart-contract systems for both
                Web3 protocol logic and Web2 security risks.
              </p>
              <p>
                The ideal hire needed prior audit ownership, strong communication with product teams, and
                practical experience with low-level engineering and incident response.
              </p>
            </div>
          </div>
        </section>

        <section className="case-detail-section" id="process">
          <div className="case-detail-section-grid">
            <div className="case-detail-section-header">
              <span className="case-detail-section-num">02</span>
              <h2>Solution &amp; Process</h2>
            </div>
            <div className="case-detail-section-copy">
              <p>
                HireU built a focused shortlist pipeline with:
                <br />- protocol-level audit track record
                <br />- exploitable-pattern detection experience
                <br />- high signal from open-source and prior client outcomes
              </p>
              <p>
                The process combined structured screening, timed technical challenge, scenario-based review,
                and final founder-level alignment interviews.
              </p>
            </div>
          </div>
        </section>

        <section className="case-detail-section" id="impact">
          <div className="case-detail-section-grid">
            <div className="case-detail-section-header">
              <span className="case-detail-section-num">03</span>
              <h2>Results &amp; Impact</h2>
            </div>
            <div className="case-detail-section-copy">
              <p>
                Role closed in 21 days with one final-round offer accepted. Time-to-hire dropped
                significantly versus prior attempts.
              </p>
              <p>
                Post-hire, the new auditor improved release confidence and reduced security-review cycles
                across critical feature launches.
              </p>
            </div>
          </div>
        </section>

        <section className="case-detail-section" id="beyond">
          <div className="case-detail-section-grid">
            <div className="case-detail-section-header">
              <span className="case-detail-section-num">04</span>
              <h2>Beyond Recruitment</h2>
            </div>
            <div className="case-detail-section-copy">
              <p>
                After the placement, collaboration continued through quarterly hiring calibration and security
                talent planning support for the client roadmap.
              </p>
            </div>
          </div>
        </section>

        <article className="case-detail-media-panel" id="screens">
          <div className="case-detail-media-label">
            <span className="case-detail-section-num">05</span>
            Screenshots
          </div>
          <img
            className="case-detail-hero-img"
            src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=88"
            alt="Technical team working on smart contract auditing"
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
  );
}
