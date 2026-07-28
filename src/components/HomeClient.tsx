"use client";

import { type CSSProperties, type SyntheticEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import { TreeLayer } from "@/components/TreeLayer";
import { FlowController } from "@/components/FlowController";
import { HeroNav } from "@/components/HeroNav";
import { Domains } from "@/components/Domains";
import {
  Brain,
  Briefcase,
  TrendingUp,
  Cpu,
  Settings2,
  Handshake,
  MessageCircle,
  Rocket,
  Heart,
  Shield,
  Zap,
  Star,
  Globe,
  Code,
  Palette,
  Target,
  Trophy,
  Users,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { HookStep } from "@/components/HookStep";
import { SiteFooter } from "@/components/SiteFooter";
import { HomeDisplayAd } from "@/components/adsense/HomeDisplayAd";

const ICON = (slug: string) => `https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${slug}.svg`;
const TEAM_AVATAR = (seed: string) =>
  `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
const FALLBACK_REVIEW_AVATAR = "/avatars/fallback-avatar.svg";

const handleReviewAvatarError = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK_REVIEW_AVATAR;
};

const COMPANIES = [
  { name: "Google", icon: ICON("google") },
  { name: "Microsoft", icon: ICON("microsoft") },
  { name: "Amazon", icon: ICON("amazon") },
  { name: "Apple", icon: ICON("apple") },
  { name: "Meta", icon: ICON("meta") },
  { name: "NVIDIA", icon: ICON("nvidia") },
  { name: "Adobe", icon: ICON("adobe") },
  { name: "Salesforce", icon: ICON("salesforce") },
  { name: "Spotify", icon: ICON("spotify") },
  { name: "Uber", icon: ICON("uber") },
];

const ICON_MAP: Record<string, typeof Brain> = {
  Brain,
  Briefcase,
  TrendingUp,
  Cpu,
  Settings2,
  Handshake,
  MessageCircle,
  Rocket,
  Heart,
  Shield,
  Zap,
  Star,
  Globe,
  Code,
  Palette,
  Target,
  Trophy,
  Users,
  Lightbulb,
  Sparkles,
};

type TeamMemberData = {
  name: string;
  role: string;
  bio: string;
  avatarUrl?: string | null;
  iconName?: string;
  tilt: string;
  featured: boolean;
};

const FALLBACK_TEAM: TeamMemberData[] = [
  {
    name: "Saraswati",
    role: "CEO",
    bio: "Visionary CEO guiding TalentForge AI's mission to connect world-class talent with AI-native companies.",
    avatarUrl: "/team/saraswati.png",
    iconName: "Brain",
    tilt: "tilt-left-1",
    featured: false,
  },
  {
    name: "Mohan",
    role: "COO",
    bio: "Operations leader scaling TalentForge AI's hiring engine—process, partnerships, and delivery excellence.",
    avatarUrl: "/team/mohan.png",
    iconName: "Briefcase",
    tilt: "tilt-center",
    featured: true,
  },
  {
    name: "Sakshi",
    role: "Head of Sales",
    bio: "Building lasting client relationships and helping companies hire exceptional tech talent, fast.",
    avatarUrl: "/team/sakshi.png",
    iconName: "TrendingUp",
    tilt: "tilt-right-1",
    featured: false,
  },
];

type HomeClientProps = {
  teamMembers?: TeamMemberData[];
};

export function HomeClient({ teamMembers }: HomeClientProps) {
  // Admin panel is the source of truth — use DB roster whenever present.
  const TEAM_MEMBERS = teamMembers && teamMembers.length > 0 ? teamMembers : FALLBACK_TEAM;
  const heroRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const msg2Ref = useRef<HTMLDivElement>(null);
  const domainsRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLElement | null>(null);
  const [teamInView, setTeamInView] = useState(false);
  const searchParams = useSearchParams();
  const [authBanner, setAuthBanner] = useState<string | null>(null);

  // Show banner from URL param
  useEffect(() => {
    if (searchParams.get("auth_error") === "business_email_required") {
      setAuthBanner("business_email_required");
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dismiss banner on scroll
  useEffect(() => {
    if (!authBanner) return;
    const onScroll = () => {
      if (window.scrollY > 60) setAuthBanner(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [authBanner]);

  useEffect(() => {
    const el = teamRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        setTeamInView(entries[0].isIntersecting);
      },
      { threshold: 0.36 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <FlowController
        heroRef={heroRef}
        storyRef={storyRef}
        msg2Ref={msg2Ref}
        domainsRef={domainsRef}
      />
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <AuroraCanvas />
      <TreeLayer />

      <main id="main-content" role="main">
        <HeroNav />

        {authBanner === "business_email_required" && (
          <div role="alert" style={{
            position: "fixed",
            top: "100px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99,
            width: "min(640px, calc(100vw - 32px))",
          }}>
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              background: "linear-gradient(132deg, rgba(60,14,14,0.92), rgba(80,18,18,0.88))",
              border: "1px solid rgba(220,80,80,0.35)",
              borderRadius: "14px",
              padding: "14px 16px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,110,110,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: "14px", color: "rgba(255,200,200,0.95)" }}>
                  Work email required
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,170,170,0.75)", lineHeight: "1.5" }}>
                  Sign in with your company email to hire. Gmail, Yahoo and other personal emails are for talent accounts.
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setAuthBanner(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,150,150,0.45)", padding: "0 0 0 4px", lineHeight: 1, fontSize: "18px", flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <section className="hero" id="hero" ref={heroRef}>
          <div className="hero-smoke" />
          <div
            className="hero-content"
            style={authBanner ? { paddingTop: "clamp(72px, 10vw, 110px)" } : undefined}
          >
            <div className="hero-kicker" aria-label="What HookStep focuses on">
              <span>Structured applications</span>
              <span>Public job directory</span>
              <span>Employer dashboards</span>
            </div>
            <h1 className="hero-title">HIRE TOP TALENT IN 24 HOURS</h1>
            <p className="hero-tagline">Hook In. Step Up. Get Hired.</p>
            <p className="hero-subtitle">
              Connect with vetted AI/ML, Full Stack, Data Science, DevOps &amp; QA professionals.
              Remote-ready experts, hired in days — not months.
            </p>
            <div className="hero-cta-row">
              <a className="hero-cta primary" href="/sign-in">
                Get Hired as Talent
              </a>
              <a className="hero-cta secondary" href="/recruiter">
                Book a Free Call
              </a>
            </div>
          </div>
        </section>

        <section className="story" id="story" ref={storyRef}>
          <div className="messages">
            <div className="msg">
              <div className="card">
                <h2>Find the Right Fit</h2>
                <p>Our AI matches candidates to roles based on skills, experience, and culture fit — not just keywords.</p>
              </div>
            </div>

            <div className="msg" id="msg2" ref={msg2Ref}>
              <div className="card">
                <h2>Smarter Hiring</h2>
                <p>Reduce time-to-hire by up to 60% with intelligent screening and automated candidate ranking.</p>
              </div>
            </div>

            <div className="msg">
              <div className="card">
                <h2>Built for Scale</h2>
                <p>Whether you&apos;re hiring one person or a hundred, TalentForge AI adapts to your workflow seamlessly.</p>
              </div>
            </div>

            <div className="msg">
              <div className="card">
                <h2>Candidate-First Experience</h2>
                <p>Give candidates a transparent, respectful hiring journey that reflects your company values.</p>
              </div>
            </div>
            <div className="msg">
              <div className="card">
                <h2>Data-Driven Decisions</h2>
                <p>Access real-time analytics on your pipeline, conversion rates, and team performance.</p>
              </div>
            </div>
            <div className="msg">
              <div className="card">
                <h2>Collaborate Effortlessly</h2>
                <p>Share candidate profiles, leave feedback, and align your team — all in one place.</p>
              </div>
            </div>

            <div ref={domainsRef}>
              <Domains />
            </div>

            <div className="company-marquee-wrap" aria-label="Company partners">
              <div className="company-marquee-glow" aria-hidden="true" />
              <div className="company-sparkles" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className="company-marquee">
                <div className="company-track">
                  {COMPANIES.map((c) => (
                    <span className="company-pill" key={c.name}>
                      <img src={c.icon} alt={c.name} className="logo-mark" />
                      {c.name}
                    </span>
                  ))}
                </div>
                <div className="company-track" aria-hidden="true">
                  {COMPANIES.map((c) => (
                    <span className="company-pill" key={`${c.name}-dup`}>
                      <img src={c.icon} alt="" className="logo-mark" />
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>


            <section
              className={`team-showcase founders-showcase ${teamInView ? "is-active" : ""}`}
              id="team"
              aria-label="Meet the founders behind TalentForge AI"
              ref={teamRef}
            >
              <p className="team-showcase-eyebrow">Leadership</p>
              <h2 className="team-showcase-title">Meet the founders behind TalentForge AI</h2>
              <p className="team-showcase-sub">
                The people shaping how companies discover and hire exceptional tech talent.
              </p>
              <div className="team-fan founders-fan" role="list">
                {TEAM_MEMBERS.map((member, index) => {
                  const Icon = ICON_MAP[member.iconName ?? "Brain"] ?? Brain;
                  const avatarSrc = member.avatarUrl || TEAM_AVATAR(member.name);
                  return (
                    <article
                      key={member.name}
                      className={`team-member-card founders-card ${member.tilt} ${member.featured ? "is-featured" : ""}`}
                      role="listitem"
                      style={{ "--card-i": index } as CSSProperties}
                    >
                      <div className="team-member-avatar-wrap">
                        <img src={avatarSrc} alt={member.name} className="team-member-avatar" loading="lazy" onError={handleReviewAvatarError} />
                      </div>
                      <h3>{member.name}</h3>
                      <span className="team-member-role">{member.role}</span>
                      <p>{member.bio}</p>
                      <span className="team-member-icon" aria-hidden="true">
                        <Icon size={18} strokeWidth={2.1} />
                      </span>
                    </article>
                  );
                })}
              </div>
            </section>

            <div className="msg">
              <div className="end-reviews-card" aria-label="Global intelligence and client reviews">
                <div className="end-reviews-visual" aria-hidden="true">
                  <svg className="network-curves" viewBox="0 0 1000 520" preserveAspectRatio="none">
                    <path className="network-curve c1" d="M500 34 C 472 112, 380 248, 138 430" />
                    <path className="network-curve c2" d="M500 34 C 488 116, 422 252, 300 394" />
                    <path className="network-curve c3" d="M500 34 C 500 134, 500 276, 500 462" />
                    <path className="network-curve c4" d="M500 34 C 512 116, 578 252, 690 386" />
                    <path className="network-curve c5" d="M500 34 C 528 112, 620 248, 862 422" />
                    <path className="network-curve c6" d="M500 34 C 468 120, 388 238, 188 334" />
                    <path className="network-curve c7" d="M500 34 C 532 120, 612 238, 812 326" />
                  </svg>

                  <div className="network-node node-1" />
                  <div className="network-node node-2" />
                  <div className="network-node node-3" />
                  <div className="network-node node-4" />
                  <div className="network-node node-5" />
                  <div className="network-node node-6" />
                  <div className="network-node node-7" />
                </div>

                <div className="end-reviews-copy">
                  <h2>Human intelligence, global reach</h2>
                  <p>
                    Illustrative themes from hiring teams that invest in clear job posts and structured reviews—less
                    noise in the funnel, more signal in each interview round.
                  </p>
                  <div className="review-stage">
                    <div className="review-track">
                      <article className="review-card">
                        <div className="review-card-copy">
                          <p>
                            &quot;When every candidate packet follows the same structure, panel debriefs take half the
                            time.&quot;
                          </p>
                          <span>Hiring lead, anonymized B2B SaaS</span>
                        </div>
                        <img
                          className="review-avatar"
                          src="https://i.pravatar.cc/140?img=21"
                          alt=""
                          loading="lazy"
                          onError={handleReviewAvatarError}
                        />
                      </article>
                      <article className="review-card">
                        <div className="review-card-copy">
                          <p>
                            &quot;Specific stack and ownership bullets in the job post filtered out mismatches before
                            the phone screen.&quot;
                          </p>
                          <span>Engineering manager, anonymized HealthTech</span>
                        </div>
                        <img
                          className="review-avatar"
                          src="https://i.pravatar.cc/140?img=32"
                          alt=""
                          loading="lazy"
                          onError={handleReviewAvatarError}
                        />
                      </article>
                      <article className="review-card">
                        <div className="review-card-copy">
                          <p>
                            &quot;Shared shortlists meant recruiters and interviewers stopped duplicating the same
                            questions.&quot;
                          </p>
                          <span>People ops, anonymized fintech</span>
                        </div>
                        <img
                          className="review-avatar"
                          src="https://i.pravatar.cc/140?img=47"
                          alt=""
                          loading="lazy"
                          onError={handleReviewAvatarError}
                        />
                      </article>
                      <article className="review-card">
                        <div className="review-card-copy">
                          <p>
                            &quot;Public listings plus explicit location rules reduced drop-off after the first
                            conversation.&quot;
                          </p>
                          <span>Talent operations, anonymized enterprise</span>
                        </div>
                        <img
                          className="review-avatar"
                          src="https://i.pravatar.cc/140?img=12"
                          alt=""
                          loading="lazy"
                          onError={handleReviewAvatarError}
                        />
                      </article>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="msg">
              <div className="card">
                <h2>Ready to Transform Hiring?</h2>
                <p>Join thousands of companies using TalentForge AI to build exceptional teams.</p>
              </div>
            </div>

            <div className="exit-sentinel" />
          </div>
        </section>

        <section className="after">
          <div className="card">
            <h2>The Future of Talent Acquisition</h2>
            <p>TalentForge AI combines AI-powered matching with a human-centered approach to help you hire faster and smarter.</p>
          </div>
        </section>

        <HomeDisplayAd />

        <SiteFooter />

        <HookStep />
      </main>
    </>
  );
}
