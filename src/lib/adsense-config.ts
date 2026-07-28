/**
 * Google AdSense — publisher identifiers are public (also exposed in ads.txt).
 * Defaults come from the live AdSense account (pub-6574958062528034).
 * Override with env when rotating publisher/units without a code change.
 * CMP / consent: see `adsense-consent-bridge.ts`.
 */

const FALLBACK_PUBLISHER_NUMERIC = "6574958062528034";
/** Existing ACTIVE matched-content / display unit from AdSense Management API. */
const FALLBACK_HOME_FOOTER_SLOT = "5342241888";
const CERTIFICATE_ID = "f08c47fec0942fa0";

function publisherNumeric(): string {
  const raw =
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_NUMERIC_ID?.trim() ||
    process.env.ADSENSE_PUBLISHER_NUMERIC_ID?.trim();
  if (raw) return raw.replace(/^pub-/i, "").replace(/^ca-pub-/i, "");
  return FALLBACK_PUBLISHER_NUMERIC;
}

/** Line for ads.txt (IAB format). */
export function getAdsTxtBody(): string {
  const n = publisherNumeric();
  return `google.com, pub-${n}, DIRECT, ${CERTIFICATE_ID}\n`;
}

/** e.g. ca-pub-6574958062528034 — for `?client=` and `data-ad-client`. */
export function getAdSenseClientId(): string {
  return `ca-pub-${publisherNumeric()}`;
}

/** Homepage / marketing display unit slot id. */
export function getHomeFooterAdSlot(): string {
  return (
    process.env.NEXT_PUBLIC_ADSENSE_HOME_FOOTER_SLOT?.trim() ||
    process.env.ADSENSE_HOME_FOOTER_SLOT?.trim() ||
    FALLBACK_HOME_FOOTER_SLOT
  );
}

/**
 * Master switch. Defaults ON so Auto ads + units ship with the known publisher.
 * Set NEXT_PUBLIC_ADSENSE_ENABLED=0 (or false) to disable.
 */
export function isAdSenseEnabled(): boolean {
  const raw = (
    process.env.NEXT_PUBLIC_ADSENSE_ENABLED ??
    process.env.ADSENSE_ENABLED ??
    "1"
  )
    .trim()
    .toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "off" || raw === "no");
}
