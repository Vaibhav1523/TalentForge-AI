import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingArticleShell } from "@/components/MarketingArticleShell";
import m from "../marketingArticle.module.css";

const BASE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "https://hookstep.in";

export const metadata: Metadata = {
  title: "Frequently asked questions | HookStep",
  description:
    "Answers for employers and candidates: how HookStep works, accounts, applications, job listings, data practices, and getting support.",
  alternates: { canonical: `${BASE_URL}/faq` },
  openGraph: {
    title: "HookStep FAQ",
    description: "Common questions about hiring and applying on HookStep.",
    url: `${BASE_URL}/faq`,
    type: "website",
  },
};

type Item = { q: string; a: ReactNode };

const SECTIONS: { id: string; label: string; items: Item[] }[] = [
  {
    id: "general",
    label: "General",
    items: [
      {
        q: "What is HookStep?",
        a: (
          <>
            HookStep is a hiring platform: employers publish jobs, manage applications in one place, and
            move candidates through their process. Job seekers browse open roles, keep a single profile, and
            apply without re-uploading the same information for every company.
          </>
        ),
      },
      {
        q: "Who is HookStep for?",
        a: (
          <>
            Teams hiring for software, data, ML/AI, platform, and related roles, and professionals who want
            a clear, professional apply experience. We also work with groups that need vetted contributor
            cohorts for data and evaluation work; see our{" "}
            <Link href="/ai-data-partners">AI data partners</Link> page for that path.
          </>
        ),
      },
      {
        q: "Who are the HookStep (hookstep.in) founders?",
        a: (
          <>
            Saraswati is CEO, Mohan is COO, and Sakshi is Head of Sales. A short overview of leadership is on
            our <Link href="/founders">founders &amp; leadership</Link> page; the homepage also highlights the
            team behind the product.
          </>
        ),
      },
      {
        q: "Is HookStep a staffing agency?",
        a: (
          <>
            No. We provide software and workflows. Employers make their own hiring decisions and communicate
            through the product where the product supports it.
          </>
        ),
      },
    ],
  },
  {
    id: "employers",
    label: "For employers and recruiters",
    items: [
      {
        q: "How do we get started?",
        a: (
          <>
            Use a business email on the <Link href="/recruiter">recruiter contact</Link> page, complete
            onboarding, and publish your first job with a clear title, location, skills, and description.
            Active listings appear in the public <Link href="/jobs">jobs directory</Link>.
          </>
        ),
      },
      {
        q: "What should a good job post include?",
        a: (
          <>
            Specific responsibilities, stack or domain requirements, seniority, location or remote policy,
            and what success looks like in the first months. Posts that read like internal reqs, not generic
            copy, attract stronger applicants and fewer mismatches.
          </>
        ),
      },
      {
        q: "How do applications arrive?",
        a: (
          <>
            Candidates apply through HookStep; their profile and materials are attached to that job in your
            dashboard so your team shares one record of who applied and when.
          </>
        ),
      },
      {
        q: "Can we close or pause a role?",
        a: (
          <>
            Yes. Update the job status when a role is filled or on hold so candidates see accurate
            information.
          </>
        ),
      },
    ],
  },
  {
    id: "candidates",
    label: "For job seekers",
    items: [
      {
        q: "How do I apply?",
        a: (
          <>
            Sign in, complete your profile (experience, skills, links, resume if you choose), then open any
            active listing and submit an application. You can track where you have already applied from your
            dashboard.
          </>
        ),
      },
      {
        q: "Does HookStep charge candidates?",
        a: (
          <>
            Candidates use the platform to discover roles and apply; refer to current in-product messaging
            for any optional services. Employers carry the business relationship for hiring.
          </>
        ),
      },
      {
        q: "Why was I asked to use a business email as a recruiter?",
        a: (
          <>
            That path reduces spam and helps us route company inquiries correctly. Candidates may use the
            providers supported at sign-in.
          </>
        ),
      },
    ],
  },
  {
    id: "privacy",
    label: "Accounts, privacy, and safety",
    items: [
      {
        q: "Where is your privacy policy?",
        a: (
          <>
            See our <Link href="/privacy">Privacy Policy</Link> for what we collect, why, retention, and your
            choices. The <Link href="/terms">Terms of Service</Link> describe acceptable use of the site.
          </>
        ),
      },
      {
        q: "Who sees my resume and profile?",
        a: (
          <>
            Employers you apply to receive the application materials you submit for their roles. Do not
            include passwords, government ID numbers, or other sensitive data that employers do not need to
            evaluate fit.
          </>
        ),
      },
      {
        q: "How do I report a problem?",
        a: (
          <>
            Use the contact options on the site (for example the recruiter flow for business issues), or
            support paths your account email provides when signed in.
          </>
        ),
      },
    ],
  },
  {
    id: "product",
    label: "Product and roadmap",
    items: [
      {
        q: "Which regions do you support?",
        a: (
          <>
            Many listings target specific countries or time zones; read each job for location and work
            authorization expectations set by the employer.
          </>
        ),
      },
      {
        q: "How often is the jobs list updated?",
        a: (
          <>
            Employers add and update roles over time. The public jobs page reflects active postings from
            participating companies.
          </>
        ),
      },
    ],
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is HookStep?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HookStep is a hiring platform: employers publish jobs, manage applications in one place, and move candidates through their process. Job seekers browse open roles, keep a single profile, and apply without re-uploading the same information for every company.",
      },
    },
    {
      "@type": "Question",
      name: "Who is HookStep for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Teams hiring for software, data, ML/AI, platform, and related roles, and professionals who want a clear, professional apply experience. HookStep also supports groups that need vetted contributor cohorts for data and evaluation work.",
      },
    },
    {
      "@type": "Question",
      name: "Is HookStep a staffing agency?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. HookStep provides software and workflows. Employers make their own hiring decisions and communicate through the product where the product supports it.",
      },
    },
    {
      "@type": "Question",
      name: "How do employers get started on HookStep?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use a business email on the recruiter contact page, complete onboarding, and publish your first job with a clear title, location, skills, and description. Active listings appear in the public jobs directory.",
      },
    },
    {
      "@type": "Question",
      name: "How do candidates apply on HookStep?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sign in, complete your profile (experience, skills, links, resume if you choose), then open any active listing and submit an application. You can track where you have already applied from your dashboard.",
      },
    },
    {
      "@type": "Question",
      name: "Where is the HookStep privacy policy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Privacy Policy explains what HookStep collects, why, retention, and your choices. The Terms of Service describe acceptable use of the site.",
      },
    },
  ],
};

export default function FaqPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
    <MarketingArticleShell>
      <div className={m.root}>
        <header className={m.hero}>
          <h1 className={m.title}>Frequently asked questions</h1>
          <p className={m.lead}>
            HookStep connects companies that need technical and specialist talent with people who are actively
            looking for the right role. Here are clear answers to what we hear most often from both sides of
            the marketplace.
          </p>
        </header>

        {SECTIONS.map((section) => (
          <section key={section.id} className={m.section} aria-labelledby={`faq-h-${section.id}`}>
            <h2 id={`faq-h-${section.id}`} className={m.sectionLabel}>
              {section.label}
            </h2>
            <div className={m.grid}>
              {section.items.map((item) => (
                <article key={item.q} className={m.card}>
                  <h3 className={m.cardTitle}>{item.q}</h3>
                  <p className={m.cardBody}>{item.a}</p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <div className={m.ctaBand}>
          <p>
            Read <Link href="/how-it-works">How HookStep works</Link>, the <Link href="/hiring-guide">hiring guide</Link>
            , or return to the <Link href="/">homepage</Link> to explore cases and success stories.
          </p>
        </div>
      </div>
    </MarketingArticleShell>
    </>
  );
}
