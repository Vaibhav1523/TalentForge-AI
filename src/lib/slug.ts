/**
 * Reserved path segments that cannot be used as company slugs.
 * Prevents collisions with existing Next.js routes.
 */
export const RESERVED_SLUGS = new Set([
  "api",
  "onboarding",
  "dashboard",
  "recruiter",
  "success-stories",
  "pricing",
  "blog",
  "blogs",
  "login",
  "logout",
  "signin",
  "signout",
  "sign-in",
  "sign-out",
  "register",
  "auth",
  "settings",
  "profile",
  "admin",
  "support",
  "help",
  "about",
  "how-it-works",
  "contact",
  "terms",
  "privacy",
  "faq",
  "founders",
  "jobs",
  "cases",
  "candidates",
  "interviews",
  "analytics",
  "new",
  "edit",
  "404",
  "500",
  "_next",
  "favicon.ico",
]);

/**
 * Converts a company name to a URL-safe slug.
 * "Acme Corp" → "acme-corp"
 * Returns null when the generated slug fails isValidSlug validation.
 */
export function toSlug(name: string): string | null {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")   // strip special chars
    .replace(/\s+/g, "-")            // spaces → hyphens
    .replace(/-+/g, "-")             // collapse double hyphens
    .replace(/^-|-$/g, "");          // trim leading/trailing hyphens
  return isValidSlug(slug) ? slug : null;
}

/**
 * Returns true if the slug is allowed (not reserved and valid format).
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 48) return false;
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) return false;
  return !RESERVED_SLUGS.has(slug);
}
