"use client";

import { useEffect } from "react";
import {
  getAdSenseClientId,
  getHomeFooterAdSlot,
  isAdSenseEnabled,
} from "@/lib/adsense-config";

type Props = {
  /** Ad unit slot from AdSense; defaults to the live HookStep unit. */
  slot?: string;
  minHeight?: number;
  className?: string;
};

/**
 * Reserved-height display unit to reduce CLS when the network fills the slot.
 * Pair with {@link AdSenseScript} on the page (or root marketing layout).
 */
export function HomeDisplayAd({
  slot,
  minHeight = 280,
  className = "hookstep-ad-slot",
}: Props) {
  const resolvedSlot = (slot || getHomeFooterAdSlot()).trim();

  useEffect(() => {
    if (!isAdSenseEnabled() || !resolvedSlot) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
    } catch {
      // ignore ad block / offline
    }
  }, [resolvedSlot]);

  const client = getAdSenseClientId();
  if (!isAdSenseEnabled() || !resolvedSlot || !client) return null;

  return (
    <aside
      className={className}
      aria-label="Advertisement"
      style={{
        minHeight,
        margin: "clamp(16px, 4vw, 32px) auto",
        maxWidth: "1200px",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "0 12px",
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", minWidth: "320px", width: "100%", maxWidth: "728px" }}
        data-ad-client={client}
        data-ad-slot={resolvedSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}

/** Alias for non-home placements. */
export const DisplayAd = HomeDisplayAd;
