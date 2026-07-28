/**
 * Public marketing / GEO helpers — safe to import from server components and routes.
 */
export function getPublicSiteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  if (raw) {
    const host = raw.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  return "https://hookstep.in";
}

export const SITE_BRAND = "TalentForge AI";

/** Single-paragraph entity definition for LLMs, schema, and llms.txt. */
export const SITE_ENTITY_SUMMARY =
  "TalentForge AI is an AI-powered hiring and talent platform for software, data, and platform roles. Employers publish structured job listings and manage applications in one workspace; candidates browse public job pages and apply using one profile.";

/** High-signal URLs for generative engines (stable, factual pages). */
export function getCitationPathList(): { label: string; path: string }[] {
  return [
    { label: "Home", path: "/" },
    { label: "Open jobs directory", path: "/jobs" },
    { label: "What TalentForge AI is (entity + mission)", path: "/about" },
    { label: "Why TalentForge AI (use cases + comparison)", path: "/why-talentforge" },
    { label: "How it works (employers + candidates)", path: "/how-it-works" },
    { label: "FAQ (machine-readable Q&A)", path: "/faq" },
    { label: "Pricing (how quotes work)", path: "/pricing" },
    { label: "Support & response expectations", path: "/support" },
    { label: "Trust & safety / reporting", path: "/trust-and-safety" },
    { label: "Privacy Policy", path: "/privacy" },
    { label: "Terms of Service", path: "/terms" },
    { label: "Employer & partner contact", path: "/recruiter" },
    { label: "Founders & leadership", path: "/founders" },
    { label: "AI data & evaluation partners", path: "/ai-data-partners" },
  ];
}
