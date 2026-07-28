"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import styles from "../recruiter/page.module.css";
import local from "./page.module.css";

export default function AiDataPartnersPage() {
  const router = useRouter();

  return (
    <main className={styles.page}>
      <AuroraCanvas />
      <div className={styles.homeSmoke} aria-hidden="true" />

      <div className={styles.exitRow}>
        <button type="button" className={styles.exitButton} aria-label="Back" onClick={() => router.back()}>
          <span aria-hidden="true">&#8592;</span> Back
        </button>
      </div>

      <section className={styles.stage}>
        <div className={styles.card} style={{ maxWidth: 560 }}>
          <h1 className={`${styles.heading} ${local.title}`}>HookStep for AI data &amp; eval teams</h1>
          <p className={local.lead}>
            We source and manage <strong>vetted contributor cohorts</strong> for vendors and labs that run
            human-in-the-loop work: preference modeling, quality evaluation, annotation, and domain review.
          </p>
          <ul className={local.list}>
            <li>Calibrated onboarding against your rubric or ours</li>
            <li>Throughput and QA metrics you can track week over week</li>
            <li>Scoped pilots (e.g. two weeks, one workflow) before scale-up</li>
          </ul>
          <div className={styles.innerLine} />
          <div className={local.actions}>
            <a
              className={`${styles.nextBtn} ${local.primaryCta}`}
              href="https://cal.com/hookstep/30min"
              target="_blank"
              rel="noopener noreferrer"
            >
              Book a 30-min call
            </a>
            <Link href="/recruiter" className={`${styles.nextBtn} ${local.secondaryCta}`}>
              Submit work email &amp; site — then schedule
            </Link>
          </div>
          <p className={`${styles.loginHint} ${local.footnote}`}>
            On the recruiter form, mention{" "}
            <strong>AI data workforce / annotation partner</strong> in the roles field so we route you correctly.
          </p>
        </div>
      </section>
    </main>
  );
}
