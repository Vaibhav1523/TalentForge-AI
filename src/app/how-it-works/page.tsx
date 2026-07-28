import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingArticleShell } from "@/components/MarketingArticleShell";
import m from "../marketingArticle.module.css";

const BASE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "https://hookstep.in";

export const metadata: Metadata = {
  title: "How HookStep works | For employers and job seekers",
  description:
    "Step-by-step overview: how companies post jobs and manage applications on HookStep, and how candidates create a profile, discover roles, and apply.",
  alternates: { canonical: `${BASE_URL}/how-it-works` },
  openGraph: {
    title: "How HookStep works",
    description: "A clear process for employers and candidates on the HookStep hiring platform.",
    url: `${BASE_URL}/how-it-works`,
    type: "website",
  },
};

type Step = { title: string; body: ReactNode };

const EMPLOYER_STEPS: Step[] = [
  {
    title: "Create a recruiter account",
    body: "Use a business email and complete onboarding so your company name and public job URL are set.",
  },
  {
    title: "Publish jobs",
    body: (
      <>
        Add title, location, employment type, skills, and a full description. Active listings appear on the
        public <Link href="/jobs">jobs directory</Link> and on your company job page when applicable.
      </>
    ),
  },
  {
    title: "Review applications",
    body: "Use the dashboard to see candidate profiles, documents, and status. Move people through shortlist, interview, or closed states according to your process.",
  },
  {
    title: "Coordinate next steps",
    body: "Keep your team on one source of truth so nobody duplicates outreach or loses context.",
  },
];

const CANDIDATE_STEPS: Step[] = [
  {
    title: "Sign in",
    body: "Complete your candidate profile: experience, skills, links, and optional resume so employers see a complete picture once.",
  },
  {
    title: "Browse open roles",
    body: "Use the jobs page. Filter by category, location, and keywords that match your background.",
  },
  {
    title: "Apply",
    body: "Submit to roles that fit. Your application stays with that job so you can track where you have already raised your hand.",
  },
  {
    title: "Watch for updates",
    body: "Follow progress from hiring teams in the product as they move your application forward.",
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingArticleShell>
      <div className={m.root}>
        <header className={m.hero}>
          <h1 className={m.title}>How HookStep works</h1>
          <p className={m.lead}>
            HookStep is built around a simple loop: companies publish real roles, candidates apply with a
            consistent profile, and both sides track progress in one place. Below is how each side typically
            moves from zero to interviews.
          </p>
        </header>

        <section className={m.section} aria-labelledby="hiw-employers">
          <h2 id="hiw-employers" className={m.sectionLabel}>
            For employers and recruiters
          </h2>
          <div className={m.grid}>
            {EMPLOYER_STEPS.map((step, i) => (
              <article key={step.title} className={m.card}>
                <h3 className={m.cardTitle}>
                  {i + 1}. {step.title}
                </h3>
                <p className={m.cardBody}>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={m.section} aria-labelledby="hiw-candidates">
          <h2 id="hiw-candidates" className={m.sectionLabel}>
            For job seekers
          </h2>
          <div className={m.grid}>
            {CANDIDATE_STEPS.map((step, i) => (
              <article key={step.title} className={m.card}>
                <h3 className={m.cardTitle}>
                  {i + 1}. {step.title}
                </h3>
                <p className={m.cardBody}>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={m.section} aria-labelledby="hiw-ai">
          <h2 id="hiw-ai" className={m.sectionLabel}>
            AI data and workforce partners
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              If you are sourcing human-in-the-loop contributors for evaluation, labeling, or review (not only
              traditional full-time hires), read{" "}
              <Link href="/ai-data-partners">HookStep for AI data and eval teams</Link> and book a short call
              if it is a fit.
            </p>
          </div>
        </section>

        <div className={m.ctaBand}>
          <p>
            Hiring? Start from <Link href="/recruiter">recruiter contact</Link>. Looking for work? Open{" "}
            <Link href="/jobs">browse jobs</Link> or <Link href="/sign-in">sign in</Link>.
          </p>
        </div>
      </div>
    </MarketingArticleShell>
  );
}
