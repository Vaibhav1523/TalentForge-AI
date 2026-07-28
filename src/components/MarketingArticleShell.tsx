import Link from "next/link";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import { HeroNav } from "@/components/HeroNav";
import { MarketingAds } from "@/components/adsense/MarketingAds";
import styles from "@/app/contentPages.module.css";

export function MarketingArticleShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuroraCanvas />
      <div className={styles.homeSmoke} aria-hidden="true" />
      <main id="main-content" role="main" className={styles.page}>
        <HeroNav />
        <div className={styles.wrap}>
          <Link href="/" className={styles.back}>
            ← Home
          </Link>
          <article className={styles.article}>{children}</article>
          <MarketingAds />
        </div>
      </main>
    </>
  );
}
