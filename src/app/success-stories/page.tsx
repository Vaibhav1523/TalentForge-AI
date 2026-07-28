"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import { TreeLayer } from "@/components/TreeLayer";
import { HeroNav } from "@/components/HeroNav";

const STORY_CARDS = [
  {
    name: "Jane D.",
    role: "NLP Specialist",
    quote: "HookStep helped me double my freelance income. The projects are consistently high-quality.",
    impact: "2x freelance income in 6 months",
    avatar: "https://i.pravatar.cc/120?img=32",
  },
  {
    name: "Alex K.",
    role: "Computer Vision",
    quote: "The platform is intuitive and the support is excellent. Highly recommend for AI experts.",
    impact: "3 long-term clients onboarded",
    avatar: "https://i.pravatar.cc/120?img=61",
  },
  {
    name: "Priya S.",
    role: "ML Engineer",
    quote: "Matched with clients who knew exactly what they wanted. Smooth and professional.",
    impact: "Faster matching in under 2 weeks",
    avatar: "https://i.pravatar.cc/120?img=48",
  },
  {
    name: "Diego R.",
    role: "Data Scientist",
    quote: "Fast payments and clear milestones. It feels like a premium marketplace.",
    impact: "Predictable milestones and payouts",
    avatar: "https://i.pravatar.cc/120?img=68",
  },
  {
    name: "Mei L.",
    role: "AI Researcher",
    quote: "Excellent project variety and great communication tools built in.",
    impact: "Higher quality briefs and scope clarity",
    avatar: "https://i.pravatar.cc/120?img=24",
  },
  {
    name: "Sam T.",
    role: "MLOps",
    quote: "I love the quality bar. Every project is serious and well-scoped.",
    impact: "Consistent repeat work with serious teams",
    avatar: "https://i.pravatar.cc/120?img=12",
  },
] as const;

const COMPANY_REVIEWS = [
  {
    company: "HookSteps",
    by: "Talent Acquisition Team",
    message: "HookStep helped us close hard-to-fill AI roles in less than three weeks.",
  },
  {
    company: "NeuralForge Labs",
    by: "Hiring Manager",
    message: "The candidate quality is consistently high and interview-to-offer time dropped fast.",
  },
  {
    company: "DataNova Systems",
    by: "People Operations",
    message: "Clear profiles and accurate matching made our hiring process smoother and faster.",
  },
  {
    company: "QuantumPeak AI",
    by: "Head of Engineering",
    message: "We filled two senior ML roles quickly with candidates that matched both skill and culture.",
  },
  {
    company: "CloudMatrix Labs",
    by: "Recruitment Lead",
    message: "Shortlisting is faster, and interview quality improved because profiles are highly relevant.",
  },
  {
    company: "VisionBridge Tech",
    by: "Operations Director",
    message: "From posting to onboarding, the full process became predictable and significantly more efficient.",
  },
  {
    company: "ScalePilot Systems",
    by: "Hiring Operations",
    message: "HookStep gave us access to niche AI talent pools we struggled to reach through traditional channels.",
  },
] as const;

export default function SuccessStoriesPage() {
  const [lead, sideA, sideB, ...bottomStories] = STORY_CARDS;
  const [activeReview, setActiveReview] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  const handleFocus = () => setIsPaused(true);
  const handleBlur = () => setIsPaused(false);

  useEffect(() => {
    if (typeof window !== "undefined" &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveReview((prev) => (prev + 1) % COMPANY_REVIEWS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <>
      <AuroraCanvas />
      <TreeLayer />
      <main id="main-content" role="main">
        <HeroNav />
        <section className="stories-page" id="success-stories" aria-label="Success stories page">
          <header className="stories-page-head">
            <h1 className="stories-page-title">
              <span className="stories-page-title-success">Success</span>
              <span className="stories-page-title-stories">Stories</span>
            </h1>
          </header>
          <section className="stories-board" aria-label="Success story mosaic">
            <h2 className="stories-board-title">
              Customer success is our <span className="accent-blue">success</span>
            </h2>
            <p className="stories-board-subtitle">Trusted outcomes from top AI talent and hiring teams</p>
            <div className="stories-ui-strip" aria-hidden="true">
              <span>Verified Results</span>
              <span>Global Hiring Teams</span>
              <span>Fast Matching</span>
            </div>

            <div className="stories-mosaic">
              <article className="stories-card stories-card-lead">
                <div className="stories-card-copy">
                  <p>{lead.quote}</p>
                  <p className="stories-lead-meta">High-trust projects, clear milestones, and consistent repeat work.</p>
                  <span className="stories-impact stories-impact-lead">{lead.impact}</span>
                  {/* TODO: wire onClick to a navigateToStory(lead.id) or openStoryModal(lead.id) call
                      once individual story pages/modals and per-story IDs are available. */}
                  <button
                    type="button"
                    className="stories-read-link"
                    aria-label={`Read story for ${lead.name}`}
                    disabled
                    aria-disabled="true"
                  >
                    Read Story <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div className="stories-card-person">
                  <Image src={lead.avatar} alt={lead.name} className="stories-avatar stories-avatar-large" width={92} height={92} priority />
                  <div>
                    <h3>{lead.name}</h3>
                    <p>{lead.role}</p>
                  </div>
                </div>
              </article>

              <article className="stories-card stories-card-side">
                <Image src={sideA.avatar} alt={sideA.name} className="stories-avatar" width={78} height={78} />
                <div>
                  <h3>{sideA.name}</h3>
                  <p>{sideA.role}</p>
                  <small>{sideA.quote}</small>
                  <span className="stories-impact">{sideA.impact}</span>
                </div>
              </article>

              <article className="stories-card stories-card-side">
                <Image src={sideB.avatar} alt={sideB.name} className="stories-avatar" width={78} height={78} />
                <div>
                  <h3>{sideB.name}</h3>
                  <p>{sideB.role}</p>
                  <small>{sideB.quote}</small>
                  <span className="stories-impact">{sideB.impact}</span>
                </div>
              </article>

              {bottomStories.map((story, idx) => (
                <article
                  className={`stories-card stories-card-mini stories-card-mini-${idx + 1}`}
                  key={`${story.name}-${story.role}`}
                >
                  <Image src={story.avatar} alt={story.name} className="stories-avatar" width={64} height={64} />
                  <div>
                    <h3>{story.name}</h3>
                    <p>{story.role}</p>
                    <small>{story.quote}</small>
                    <span className="stories-impact">{story.impact}</span>
                  </div>
                </article>
              ))}
            </div>

          </section>

          <div className="stories-section-divider" aria-hidden="true">
            <span />
          </div>

          <section className="company-reviews-section" aria-label="Company reviews section">
            <article
            className="company-reviews-panel"
            aria-label="Company reviews"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocusCapture={handleFocus}
            onBlurCapture={handleBlur}
          >
              <div className="company-reviews-head">
                <h3>Company Reviews</h3>
                <p>What teams say after hiring with HookStep</p>
              </div>
              <span className="company-reviews-mark" aria-hidden="true">
                "
              </span>
              <div className="company-reviews-slider" aria-live="polite">
                {COMPANY_REVIEWS.map((review, idx) => (
                  <div
                    key={`${review.company}-${review.by}`}
                    className={`company-reviews-slide ${idx === activeReview ? "is-active" : ""}`}
                  >
                    <h4>{review.company}</h4>
                    <p>{review.message}</p>
                    <small>{review.by}</small>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="reviews-pause-toggle"
                aria-label={isPaused ? "Play reviews" : "Pause reviews"}
                onClick={() => setIsPaused((p) => !p)}
              >
                {isPaused ? "▶" : "⏸"}
              </button>
              <div className="company-reviews-dots" aria-hidden="true">
                {COMPANY_REVIEWS.map((review, idx) => (
                  <span
                    key={`${review.company}-dot`}
                    className={`company-reviews-dot ${idx === activeReview ? "is-active" : ""}`}
                  />
                ))}
              </div>
            </article>
          </section>
        </section>
      </main>
    </>
  );
}
