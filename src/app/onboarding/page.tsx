"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import { SITE_LOGO_SRC } from "@/lib/site-brand";
import Link from "next/link";
import styles from "./onboarding.module.css";

const ROLE_OPTIONS = [
  "Full Stack Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "AI / ML Engineer",
  "Data Scientist",
  "Data Engineer",
  "DevOps / SRE",
  "QA / SDET",
  "Mobile Engineer",
  "Product Manager",
  "Designer / UX",
  "Engineering Manager",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [hiresFor, setHiresFor] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleRole = (role: string) => {
    setHiresFor((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const addCustomRole = () => {
    const trimmed = customRole.trim();
    if (trimmed && !hiresFor.includes(trimmed)) {
      setHiresFor((prev) => [...prev, trimmed]);
    }
    setCustomRole("");
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      e.target.value = "";
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }
    if (file.size > 800 * 1024) {
      setError("Logo must be 800 KB or smaller.");
      e.target.value = "";
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.onerror = () => {
      console.error("[onboarding] FileReader error reading logo");
      setError("Failed to read the selected file. Please try again.");
      setLogoFile(null);
      setLogoPreview(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      let companyLogoUrl: string | undefined;

      if (logoFile) {
        try {
          const form = new FormData();
          form.append("file", logoFile);
          const uploadRes = await fetch("/api/upload/company-logo", {
            method: "POST",
            body: form,
          });
          if (!uploadRes.ok) {
            const errBody = await uploadRes.json().catch(() => ({}));
            setError(errBody?.error ?? "Logo upload failed. Please try again.");
            setSaving(false);
            return;
          }
          const uploadBody = await uploadRes.json();
          companyLogoUrl = uploadBody.logoUrl;
        } catch {
          setError("Logo upload failed due to a network error. Please try again.");
          setSaving(false);
          return;
        }
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          ...(companyWebsite.trim() && { companyWebsite: companyWebsite.trim() }),
          hiresFor,
          ...(companyLogoUrl && { companyLogoUrl }),
          onboardingComplete: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to save. Please try again.");
      }

      const saved = await res.json();
      const slug = saved?.companySlug;

      // Refresh JWT so middleware sees onboardingComplete = true + companySlug
      await updateSession();
      router.push(slug ? `/c/${slug}` : "/dashboard/jobs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <AuroraCanvas />
      <div className={styles.homeSmoke} aria-hidden="true" />

      <div className={styles.exitRow}>
        <button
          type="button"
          className={styles.exitButton}
          aria-label="Go back"
          onClick={() => router.back()}
        >
          &#8592; Exit
        </button>
      </div>

      <section className={styles.stage}>
        <div className={styles.card}>
          <div className={styles.siteBrandRow}>
            <Link href="/" className={styles.siteBrandLink} aria-label="HookStep home">
              <img
                src={SITE_LOGO_SRC}
                alt=""
                width={48}
                height={48}
                className={styles.siteBrandLogo}
                decoding="async"
              />
            </Link>
          </div>
          <h1 className={styles.heading}>Set up your company</h1>
          <p className={styles.subtitle}>
            Tell us about your company so we can match you with the right talent.
          </p>

          {/* Logo upload */}
          <div className={styles.logoUploadRow}>
            <label className={styles.logoUploadBox} htmlFor="company-logo-input">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Company logo preview"
                  width={70}
                  height={70}
                  className={styles.logoPreview}
                />
              ) : (
                <div className={styles.logoPlaceholder}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path d="M3 9l4-4 4 4 4-4 4 4" />
                  </svg>
                </div>
              )}
              <input
                id="company-logo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                className={styles.fileInput}
              />
            </label>
            <div>
              <p className={styles.logoHint}>Company logo</p>
              <p className={styles.logoMeta}>JPG, PNG, SVG · max 800 KB · optional</p>
            </div>
          </div>

          {/* Company details */}
          <div className={styles.gridTwo}>
            <input
              type="text"
              className={styles.input}
              placeholder="Company name *"
              aria-label="Company name"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); setError(""); }}
              autoFocus
            />
            <input
              type="url"
              className={styles.input}
              placeholder="Company website (Optional)"
              aria-label="Company website"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
            />
          </div>

          {/* Roles */}
          <p className={styles.rolesLabel}>What roles do you hire for?</p>
          <div className={styles.rolesGrid}>
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                type="button"
                className={`${styles.roleChip} ${hiresFor.includes(role) ? styles.roleChipActive : ""}`}
                onClick={() => toggleRole(role)}
              >
                {role}
              </button>
            ))}
            {hiresFor
              .filter((r) => !ROLE_OPTIONS.includes(r))
              .map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.roleChip} ${styles.roleChipActive}`}
                  onClick={() => toggleRole(r)}
                >
                  {r} ✕
                </button>
              ))}
          </div>

          <div className={styles.customRoleRow}>
            <input
              type="text"
              className={styles.input}
              placeholder="Add a custom role…"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addCustomRole(); }
              }}
            />
            <button
              type="button"
              className={styles.addBtn}
              onClick={addCustomRole}
              disabled={!customRole.trim()}
            >
              Add
            </button>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.innerLine} />
          <div className={styles.bottomRow}>
            <button
              type="button"
              className={styles.nextBtn}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving
                ? "Setting up…"
                : <>Go to Dashboard <span className={styles.nextArrow} aria-hidden>&#8250;</span></>}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
