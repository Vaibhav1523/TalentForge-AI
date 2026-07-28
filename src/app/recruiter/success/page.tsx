import Link from "next/link";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import styles from "../next/page.module.css";

export default function BookingSuccessPage() {
  return (
    <main className={styles.page}>
      <AuroraCanvas />
      <div className={styles.homeSmoke} aria-hidden="true" />
      <section className={styles.successStage}>
        <div className={styles.successCard}>
          <div className={styles.tickCircle} aria-hidden="true">
            <span className={styles.tickMark}>✓</span>
          </div>
          <h1 className={styles.successTitle}>Booking Confirmed!</h1>
          <p className={styles.successText}>
            Your call is scheduled. Check your email for the calendar invite — we look forward to speaking with you.
          </p>
          <Link href="/" className={styles.successBtn}>
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
