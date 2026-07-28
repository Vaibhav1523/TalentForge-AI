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

export function PyminersCaseContent() {
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
            <span>Pyminers</span>
          </div>

          <h1 className="case-detail-headline">Senior Bitcoin Script Developer for Pyminers</h1>

          <div className="case-detail-hero-bar">
            <span className="case-detail-brand-badge">
              <Building2 size={16} />
              Pyminers
            </span>
            <a className="case-detail-btn" href="https://www.pyminers.com" target="_blank" rel="noopener noreferrer">
              Client&apos;s Website <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="case-detail-stats">
            <div className="case-detail-stat">
              <div className="case-detail-stat-icon"><Briefcase size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Role</span>
                <span className="case-detail-stat-value">Senior Bitcoin Script Developer</span>
              </div>
            </div>
            <div className="case-detail-stat">
              <div className="case-detail-stat-icon"><MapPin size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Location</span>
                <span className="case-detail-stat-value">GMT+2 to GMT+6</span>
              </div>
            </div>
            <div className="case-detail-stat case-detail-stat--accent">
              <div className="case-detail-stat-icon"><Clock size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Filled in</span>
                <span className="case-detail-stat-value">19 days</span>
              </div>
            </div>
          </div>

          <div className="case-detail-stats">
            <div className="case-detail-stat">
              <div className="case-detail-stat-icon"><Shield size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Urgency</span>
                <span className="case-detail-stat-value">ASAP</span>
              </div>
            </div>
            <div className="case-detail-stat">
              <div className="case-detail-stat-icon"><Calendar size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Date</span>
                <span className="case-detail-stat-value">Nov 3, 2024</span>
              </div>
            </div>
            <div className="case-detail-stat">
              <div className="case-detail-stat-icon"><Briefcase size={18} /></div>
              <div>
                <span className="case-detail-stat-label">Compensation</span>
                <span className="case-detail-stat-value">NDA</span>
              </div>
            </div>
          </div>

          <article className="case-detail-hero-panel">
            <img
              className="case-detail-hero-img"
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=90"
              alt="Team during candidate interview discussion"
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
                Pyminers needed a senior Bitcoin Script developer with strong open-source contributions and
                production-level blockchain engineering experience.
              </p>
              <p>
                Core expectations included deep low-level coding, high ownership, and the ability to deliver
                quickly under strict timelines.
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
                Veretin Recruitment executed a targeted search and identified an exceptional candidate with:
                <br />- 8+ years of Bitcoin Script development
                <br />- 10+ years with C++, C, and full-stack platforms
                <br />- proven Web3 open-source work and delivery discipline
              </p>
              <p>
                The workflow covered screening, deep technical validation, behavioral fit checks, and final
                client-led interviews with assignment-based evaluation.
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
                Position filled in 19 calendar days, beating typical market timelines for senior blockchain
                roles while maintaining quality and confidence on both sides.
              </p>
              <p>
                Client satisfaction remained high post-onboarding and the candidate integrated smoothly into
                Pyminers&apos; remote engineering team.
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
                Collaboration extended beyond hiring milestones. The Veretin team met Luis A. Ploennig in person
                at Consensus Hong Kong, strengthening long-term partnership trust.
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
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=90"
            alt="Team during candidate interview discussion"
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
