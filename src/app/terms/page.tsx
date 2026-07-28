import type { Metadata } from "next";
import Link from "next/link";
import { MarketingArticleShell } from "@/components/MarketingArticleShell";
import m from "../marketingArticle.module.css";

const BASE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "https://hookstep.in";

export const metadata: Metadata = {
  title: "Terms of Service | HookStep",
  description:
    "Terms governing use of the HookStep hiring platform, accounts, job listings, applications, and acceptable use.",
  alternates: { canonical: `${BASE_URL}/terms` },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <MarketingArticleShell>
      <div className={m.root}>
        <header className={m.hero}>
          <h1 className={m.title}>Terms of Service</h1>
          <p className={m.meta}>Last updated: 31 March 2026</p>
          <p className={m.lead}>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of HookStep&apos;s
            websites, applications, and related services (collectively, the &quot;Service&quot;) operated by
            HookStep (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing or using the Service,
            you agree to these Terms and our <Link href="/privacy">Privacy Policy</Link>. If you do not agree,
            do not use the Service.
          </p>
        </header>

        <section className={m.section} aria-labelledby="terms-eligibility">
          <h2 id="terms-eligibility" className={m.sectionLabel}>
            Eligibility
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              You must be able to form a binding contract in your jurisdiction and meet any minimum age
              requirements for the Service. If you use the Service on behalf of an organization, you
              represent that you have authority to bind that organization.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-accounts">
          <h2 id="terms-accounts" className={m.sectionLabel}>
            Accounts
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              You are responsible for maintaining the confidentiality of your credentials and for activity under
              your account. Provide accurate information and keep it updated. We may suspend or terminate
              accounts that violate these Terms or create risk for others.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-service">
          <h2 id="terms-service" className={m.sectionLabel}>
            The Service
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              HookStep provides tools for employers to publish jobs and manage applications, and for candidates
              to discover roles and apply. We may modify, suspend, or discontinue features with reasonable
              notice where practicable. The Service may integrate third-party authentication or infrastructure;
              those providers&apos; terms may also apply.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-employers">
          <h2 id="terms-employers" className={m.sectionLabel}>
            Employers and job content
          </h2>
          <div className={m.card}>
            <ul className={m.list}>
              <li>
                You are responsible for the accuracy and legality of job postings and communications to
                candidates.
              </li>
              <li>
                You will not post discriminatory, misleading, or fraudulent listings or solicit fees from
                applicants in violation of law.
              </li>
              <li>
                You grant us a license to host, display, and distribute job content as needed to operate the
                Service.
              </li>
            </ul>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-candidates">
          <h2 id="terms-candidates" className={m.sectionLabel}>
            Candidates and applications
          </h2>
          <div className={m.card}>
            <ul className={m.list}>
              <li>
                You will provide truthful application materials and respect confidential or proprietary
                information of employers.
              </li>
              <li>Employers make their own hiring decisions; HookStep does not guarantee interviews or offers.</li>
            </ul>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-acceptable">
          <h2 id="terms-acceptable" className={m.sectionLabel}>
            Acceptable use
          </h2>
          <div className={m.card}>
            <p className={m.body}>You agree not to:</p>
            <ul className={m.list}>
              <li>Violate applicable laws or third-party rights.</li>
              <li>
                Scrape, crawl, or harvest the Service at scale without permission, or bypass security measures.
              </li>
              <li>Upload malware, spam users, or attempt unauthorized access to systems or data.</li>
              <li>
                Use the Service to build a competing product using our proprietary data or interfaces in breach
                of these Terms.
              </li>
            </ul>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-ip">
          <h2 id="terms-ip" className={m.sectionLabel}>
            Intellectual property
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              The Service, including its design, branding, and software, is owned by HookStep or its licensors.
              You retain ownership of content you submit; you grant us the rights necessary to operate and
              improve the Service, including displaying content you submit to intended recipients (such as
              employers receiving applications).
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-disclaimer">
          <h2 id="terms-disclaimer" className={m.sectionLabel}>
            Disclaimers
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY
              KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-liability">
          <h2 id="terms-liability" className={m.sectionLabel}>
            Limitation of liability
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOOKSTEP AND ITS AFFILIATES WILL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA,
              OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR AGGREGATE LIABILITY FOR CLAIMS RELATING TO
              THE SERVICE IS LIMITED TO THE GREATER OF AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE MONTHS
              BEFORE THE CLAIM OR ONE HUNDRED DOLLARS (USD), IF NO FEES APPLIED.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-indemnity">
          <h2 id="terms-indemnity" className={m.sectionLabel}>
            Indemnity
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              You will defend and indemnify HookStep against claims arising from your content, your use of the
              Service in violation of these Terms, or your violation of law or third-party rights.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-law">
          <h2 id="terms-law" className={m.sectionLabel}>
            Governing law and disputes
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              These Terms are governed by the laws applicable to HookStep&apos;s operating entity, without regard
              to conflict-of-law rules. Courts or forums in that jurisdiction will have exclusive venue unless
              otherwise required by mandatory consumer protection law in your country.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-changes">
          <h2 id="terms-changes" className={m.sectionLabel}>
            Changes
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              We may update these Terms from time to time. We will post the updated Terms on this page and
              update the &quot;Last updated&quot; date. Continued use after changes constitutes acceptance of
              the revised Terms, to the extent permitted by law.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="terms-contact">
          <h2 id="terms-contact" className={m.sectionLabel}>
            Contact
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              For questions about these Terms, use the contact options on the HookStep website, such as the{" "}
              <Link href="/recruiter">recruiter contact</Link> page.
            </p>
          </div>
        </section>

        <div className={m.ctaBand}>
          <p>
            See also <Link href="/privacy">Privacy Policy</Link> and <Link href="/faq">FAQ</Link>.
          </p>
        </div>
      </div>
    </MarketingArticleShell>
  );
}
