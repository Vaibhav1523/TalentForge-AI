import type { Metadata } from "next";
import Link from "next/link";
import { MarketingArticleShell } from "@/components/MarketingArticleShell";
import m from "../marketingArticle.module.css";

const BASE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "https://hookstep.in";

const host = BASE_URL.replace(/^https?:\/\//, "");

export const metadata: Metadata = {
  title: "Privacy Policy | HookStep",
  description:
    "How HookStep collects, uses, stores, and protects personal information when you use our hiring platform.",
  alternates: { canonical: `${BASE_URL}/privacy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <MarketingArticleShell>
      <div className={m.root}>
        <header className={m.hero}>
          <h1 className={m.title}>Privacy Policy</h1>
          <p className={m.meta}>Last updated: 5 April 2026</p>
          <p className={m.lead}>
            This Privacy Policy describes how HookStep (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
            handles personal information when you visit {host} or related services (the &quot;Service&quot;).
            By using the Service, you agree to this policy alongside our{" "}
            <Link href="/terms">Terms of Service</Link>.
          </p>
        </header>

        <section className={m.section} aria-labelledby="privacy-collect">
          <h2 id="privacy-collect" className={m.sectionLabel}>
            Information we collect
          </h2>
          <div className={m.card}>
            <ul className={m.list}>
              <li>
                <strong>Account and profile data:</strong> name, email address, role (recruiter or candidate),
                company name where relevant, and profile fields you choose to provide (phone, location, social
                links, skills, compensation expectations, notice period).
              </li>
              <li>
                <strong>Application materials:</strong> resumes, cover letters, portfolio links, and other
                files or text you submit when applying to jobs.
              </li>
              <li>
                <strong>Authentication data:</strong> when you sign in with a third-party provider (such as
                Google, GitHub, or LinkedIn), we receive identifiers and basic profile information according to
                that provider&apos;s consent screen.
              </li>
              <li>
                <strong>Sign in with LinkedIn:</strong> if you choose LinkedIn, we use LinkedIn&apos;s OpenID
                Connect sign-in to authenticate you. We may receive your LinkedIn member identifier (sub), name,
                email address (when you grant it), and profile image URL, solely to create your session and
                populate your HookStep account. We do not post to LinkedIn on your behalf through sign-in. Use
                of LinkedIn data is subject to this policy and{" "}
                <a href="https://www.linkedin.com/legal/privacy-policy" rel="noopener noreferrer" target="_blank">
                  LinkedIn&apos;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Usage and technical data:</strong> IP address, device and browser type, pages viewed,
                and timestamps, used to secure the Service, debug issues, and understand aggregate usage.
              </li>
              <li>
                <strong>Communications:</strong> messages you send us through forms, email, or support channels.
              </li>
            </ul>
          </div>
        </section>

        <section className={m.section} aria-labelledby="privacy-use">
          <h2 id="privacy-use" className={m.sectionLabel}>
            How we use information
          </h2>
          <div className={m.card}>
            <ul className={m.list}>
              <li>To create and maintain accounts, authenticate users, and deliver core product features.</li>
              <li>To show job listings, process applications, and help recruiters evaluate candidates.</li>
              <li>
                To send transactional notices (for example application status, security alerts) and, where
                permitted, product updates you can opt out of.
              </li>
              <li>To detect abuse, fraud, and security incidents; to comply with legal obligations.</li>
              <li>To improve reliability, performance, and user experience of the Service.</li>
            </ul>
          </div>
        </section>

        <section className={m.section} aria-labelledby="privacy-legal">
          <h2 id="privacy-legal" className={m.sectionLabel}>
            Legal bases (where applicable)
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              Depending on your region, we rely on appropriate legal bases such as performance of a contract,
              legitimate interests (for example securing our systems and improving the product), consent where
              required, and legal obligation.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="privacy-share">
          <h2 id="privacy-share" className={m.sectionLabel}>
            Sharing of information
          </h2>
          <div className={m.card}>
            <p className={m.body}>We may share information with:</p>
            <ul className={m.list}>
              <li>
                <strong>Employers and recruiters</strong> when you apply to their jobs or interact with their
                listings. Your application content is shared with the relevant company account.
              </li>
              <li>
                <strong>Service providers</strong> who host infrastructure, store files, send email, or provide
                analytics, under contracts that limit use to providing services to us.
              </li>
              <li>
                <strong>Authorities</strong> when required by law or to protect rights, safety, and integrity of
                users and the Service.
              </li>
            </ul>
            <p className={m.body}>We do not sell your personal information as a commodity.</p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="privacy-retention">
          <h2 id="privacy-retention" className={m.sectionLabel}>
            Retention
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              We keep information for as long as your account is active or as needed to provide the Service,
              comply with law, resolve disputes, and enforce agreements. You may request deletion where
              applicable law applies, subject to legitimate retention needs.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="privacy-security">
          <h2 id="privacy-security" className={m.sectionLabel}>
            Security
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              We use administrative, technical, and organizational measures designed to protect information.
              No method of transmission or storage is completely secure; we encourage strong passwords and safe
              use of linked accounts.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="privacy-intl">
          <h2 id="privacy-intl" className={m.sectionLabel}>
            International transfers
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              We may process data in countries other than where you live. Where required, we use appropriate
              safeguards for cross-border transfers.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="privacy-rights">
          <h2 id="privacy-rights" className={m.sectionLabel}>
            Your choices and rights
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              Depending on jurisdiction, you may have rights to access, correct, delete, or export personal data;
              to object to or restrict certain processing; and to withdraw consent where processing is
              consent-based. Contact us to exercise these rights. You may also lodge a complaint with a data
              protection authority.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="privacy-children">
          <h2 id="privacy-children" className={m.sectionLabel}>
            Children
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              The Service is not directed at children under the age where they cannot lawfully use the platform
              in their region. We do not knowingly collect personal information from children.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="privacy-changes">
          <h2 id="privacy-changes" className={m.sectionLabel}>
            Changes
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              We may update this policy from time to time. We will post the revised version on this page and
              update the &quot;Last updated&quot; date.
            </p>
          </div>
        </section>

        <section className={m.section} aria-labelledby="privacy-contact">
          <h2 id="privacy-contact" className={m.sectionLabel}>
            Contact
          </h2>
          <div className={m.card}>
            <p className={m.body}>
              For privacy-related requests, email{" "}
              <a href="mailto:support@mail.hookstep.in">support@mail.hookstep.in</a> or reach us through the{" "}
              <Link href="/recruiter">recruiter contact</Link> flow on this site.
            </p>
          </div>
        </section>

        <div className={m.ctaBand}>
          <p>
            See also <Link href="/terms">Terms of Service</Link> and <Link href="/faq">FAQ</Link>.
          </p>
        </div>
      </div>
    </MarketingArticleShell>
  );
}
