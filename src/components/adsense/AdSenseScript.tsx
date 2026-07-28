"use client";

import Script from "next/script";
import { getAdSenseClientId, isAdSenseEnabled } from "@/lib/adsense-config";

/**
 * Loads the AdSense library once (required for Auto ads + display units).
 * Safe on public marketing pages; do not mount inside authenticated app shells.
 */
export function AdSenseScript() {
  if (!isAdSenseEnabled()) return null;
  const client = getAdSenseClientId();
  if (!client) return null;
  return (
    <Script
      id="adsense-loader"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        client
      )}`}
      crossOrigin="anonymous"
    />
  );
}
