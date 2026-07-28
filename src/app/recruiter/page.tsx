"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import styles from "./page.module.css";

// Lightweight client-side pre-check (top 20 providers) for instant UX feedback.
// The full 4 800-domain check runs server-side in /api/leads.
const COMMON_PERSONAL_DOMAINS = new Set([
  "gmail.com","googlemail.com","yahoo.com","ymail.com",
  "hotmail.com","outlook.com","live.com","msn.com",
  "icloud.com","me.com","mac.com",
  "aol.com","protonmail.com","proton.me","pm.me",
  "zoho.com","fastmail.com","hey.com","tutanota.com","tuta.io",
]);

function isPersonalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && COMMON_PERSONAL_DOMAINS.has(domain);
}

export default function RecruiterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setSubmitting(true);
    setFormError("");
    const data = new FormData(form);

    const name    = data.get("name") as string;
    const email   = data.get("email") as string;

    if (isPersonalEmail(email)) {
      setEmailError("Please use your business email address.");
      setSubmitting(false);
      return;
    }
    setEmailError("");
    let website = (data.get("website") as string).trim();
    if (website && !/^https?:\/\//i.test(website)) {
      website = `https://${website}`;
    }
    try {
      new URL(website);
    } catch {
      setFormError("Please enter a valid company website URL (e.g. https://company.com).");
      setSubmitting(false);
      return;
    }
    const company = website;
    const phone   = [data.get("countryCode"), data.get("contactNumber")]
                      .filter(Boolean).join(" ") || undefined;
    const roles   = (data.get("roles") as string) || undefined;

    // Save lead to DB — await so the request isn't cancelled by the navigation below
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, phone, roles }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Surface business-rule rejections (e.g. personal email) back to the user
        if (res.status === 400 && body?.error) {
          if (body.error.toLowerCase().includes("email")) {
            setEmailError(body.error);
          } else {
            setFormError(body.error ?? "Validation failed. Please check your details.");
          }
          setSubmitting(false);
          return;
        }
        console.error("[/api/leads] Failed to save lead:", res.status, body);
      }
    } catch {
      // Non-blocking: continue to redirect even if the save fails
    }

    // Redirect directly to Cal.com with name + email pre-filled
    const calUrl = new URL("https://cal.com/hookstep/30min");
    calUrl.searchParams.set("name", name);
    calUrl.searchParams.set("email", email);
    window.location.href = calUrl.toString();
  };

  return (
    <main className={styles.page}>
      <AuroraCanvas />
      <div className={styles.homeSmoke} aria-hidden="true" />

      <div className={styles.exitRow}>
        <button type="button" className={styles.exitButton} aria-label="Exit page" onClick={() => router.back()}>
          <span aria-hidden="true">&#8592;</span> Exit
        </button>
      </div>

      <section className={styles.stage}>
        <form id="recruiter-form" className={styles.card} onSubmit={onSubmit}>
          <h1 className={styles.heading}>
            How can we reach you? <span className={styles.required}>*</span>
          </h1>

          <div className={styles.gridTwo}>
            <div>
              <input
                id="name"
                name="name"
                className={styles.input}
                placeholder="Name *"
                aria-label="Name"
                required
              />
            </div>
            <div>
              <input
                id="email"
                name="email"
                type="email"
                className={`${styles.input} ${emailError ? styles.inputError : ""}`}
                placeholder="Work email *"
                aria-label="Work email"
                aria-describedby={emailError ? "email-error" : undefined}
                onChange={() => setEmailError("")}
                required
              />
              {emailError && (
                <p id="email-error" className={styles.fieldError}>{emailError}</p>
              )}
            </div>
          </div>

          <input
            id="website"
            name="website"
            type="text"
            className={styles.input}
            placeholder="Company website (https://company.com) *"
            aria-label="Company Website URL"
            required
          />

          <div className={styles.contactRow}>
            <select id="countryCode" name="countryCode" className={styles.codeSelect} aria-label="Country code">
              <option value="+1">US +1</option>
              <option value="+91">IN +91</option>
              <option value="+44">UK +44</option>
              <option value="+971">UAE +971</option>
              <option value="+61">AU +61</option>
              <option value="+65">SG +65</option>
            </select>
            <input
              id="contactNumber"
              name="contactNumber"
              type="tel"
              className={styles.input}
              placeholder="Contact number (Optional)"
              aria-label="Contact number"
            />
          </div>

          <textarea
            id="roles"
            name="roles"
            className={styles.textarea}
            placeholder="What roles are you looking to fill? (Optional)"
            aria-label="What roles are you looking to fill?"
          />

          {formError && (
            <p className={styles.fieldError} role="alert">{formError}</p>
          )}
          <div className={styles.innerLine} />
          <div className={styles.bottomRow}>
            <p className={styles.loginHint}>
              Already hiring on HookStep? <a href="/sign-in">Log in</a>
            </p>
            <button type="submit" className={styles.nextBtn} disabled={submitting}>
              {submitting ? "Saving…" : <>Next <span className={styles.nextArrow} aria-hidden="true">&#8250;</span></>}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
