import type { Metadata } from "next";
import Link from "next/link";
import { MarketingArticleShell } from "@/components/MarketingArticleShell";
import m from "../marketingArticle.module.css";

const BASE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "https://hookstep.in";

export const metadata: Metadata = {
  title: "About HookStep | Hiring platform for tech teams",
  description:
    "HookStep connects employers with vetted engineers and specialists across AI/ML, full-stack, data, DevOps, and QA. Learn who we serve and how the platform works.",
  alternates: { canonical: `${BASE_URL}/about` },
  openGraph: {
    title: "About HookStep",
    description:
      "A hiring platform focused on speed, signal, and a better experience for both companies and candidates.",
    url: `${BASE_URL}/about`,
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <MarketingArticleShell>
      <div className={m.root}>
        <header className={m.hero}>
          <h1 className={m.title}>About HookStep</h1>
          <p className={m.lead}>
            HookStep is a hiring and talent platform built for teams that need strong technical hires without
            months of noise. We combine structured job listings, applicant workflows, and human review so
            employers see relevant profiles and candidates understand roles before they invest time.
          </p>
        </header>

        <section className={m.section} aria-labelledby="about-founders">
          <h2 id="about-founders" className={m.sectionLabel}>
            Leadership
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              For <strong>HookStep founders</strong>, the leadership team, and how the company is organized,
              see our dedicated <Link href="/founders">founders &amp; leadership</Link> page (hookstep.in
              /founders).
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="about-what">
          <h2 id="about-what" className={m.sectionLabel}>
            What we do
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              Companies publish open roles on HookStep, manage applications in one place, and coordinate next
              steps with candidates. Job seekers browse public listings, save their profile and documents once,
              and apply to roles that match their skills, whether they specialize in machine learning, backend
              systems, data science, quality engineering, or adjacent technical disciplines.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="about-who">
          <h2 id="about-who" className={m.sectionLabel}>
            Who we serve
          </h2>
          <div className={m.card}>
            <ul className={m.list}>
              <li>
                <strong>Employers and recruiters</strong> hiring for software, data, and platform roles who want
                a clear pipeline and fewer mismatched applicants.
              </li>
              <li>
                <strong>Candidates</strong> who want transparent job details, a single place to track
                applications, and a professional experience end to end.
              </li>
              <li>
                <strong>Teams running AI data and evaluation programs</strong> can also engage with us around
                vetted contributor cohorts; see our <Link href="/ai-data-partners">AI data partners</Link> page
                for that track.
              </li>
            </ul>
          </div>
        </section>

        <section className={m.section} aria-labelledby="about-quality">
          <h2 id="about-quality" className={m.sectionLabel}>
            How we think about quality
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              We care about useful job descriptions, accurate skill tags, and flows that respect both sides of
              the market. The product is built to reduce back-and-forth: structured fields, consistent apply
              paths, and dashboards that keep status visible. We continue to invest in clarity, performance, and
              accessibility across the site.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="about-contact">
          <h2 id="about-contact" className={m.sectionLabel}>
            Contact
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              For employer inquiries, demos, or partnerships, use the{" "}
              <Link href="/recruiter">recruiter contact</Link> flow on this site. For general questions about
              listings or your account, sign in and use the in-product paths, or reach out via the channels
              linked from our homepage.
            </p>
          </div>
        </section>

        <div className={m.ctaBand}>
          <p>
            New here? Read <Link href="/how-it-works">how it works</Link>, browse <Link href="/jobs">open jobs</Link>
            , or see the <Link href="/faq">FAQ</Link>.
          </p>
        </div>
      </div>
    </MarketingArticleShell>
  );
}
