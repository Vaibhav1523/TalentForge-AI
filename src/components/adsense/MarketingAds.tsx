import { AdSenseScript } from "@/components/adsense/AdSenseScript";
import { DisplayAd } from "@/components/adsense/HomeDisplayAd";
import { isAdSenseEnabled } from "@/lib/adsense-config";

/**
 * AdSense bootstrap + one display unit for public marketing pages.
 * Keep off /admin, /dashboard, /c/*, and auth routes.
 */
export function MarketingAds({
  slot,
  showUnit = true,
}: {
  slot?: string;
  showUnit?: boolean;
}) {
  if (!isAdSenseEnabled()) return null;
  return (
    <>
      <AdSenseScript />
      {showUnit ? <DisplayAd slot={slot} /> : null}
    </>
  );
}
