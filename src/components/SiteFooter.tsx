import Link from "next/link";
import styles from "./SiteFooter.module.css";
import { SITE_LOGO_SRC } from "@/lib/site-brand";

export function SiteFooter() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <Link href="/" className={styles.brandMark} aria-label="TalentForge AI home">
        <img
          className={styles.brandImg}
          src={SITE_LOGO_SRC}
          alt=""
          width={44}
          height={44}
          decoding="async"
        />
      </Link>
      <nav className={styles.nav} aria-label="Site">
        <Link href="/about">About</Link>
        <Link href="/founders">Founders</Link>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/jobs">Browse jobs</Link>
        <Link href="/cases">Cases</Link>
        <Link href="/success-stories">Success stories</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
      <p className={styles.note}>TalentForge AI — AI hiring platform for tech and specialist roles.</p>
    </footer>
  );
}
