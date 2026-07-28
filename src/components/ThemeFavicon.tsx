"use client";

import { useEffect } from "react";
import { SITE_FAVICON_DARK_SRC, SITE_FAVICON_LIGHT_SRC } from "@/lib/site-brand";

function applyFaviconHref(theme: string | null) {
  const href = theme === "light" ? SITE_FAVICON_LIGHT_SRC : SITE_FAVICON_DARK_SRC;
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
  links.forEach((link) => {
    if (link.getAttribute("href") !== href) {
      link.setAttribute("href", href);
    }
  });
}

/** Keeps tab favicon in sync with html[data-theme] (dashboard toggle + inline boot script). */
export function ThemeFavicon() {
  useEffect(() => {
    applyFaviconHref(document.documentElement.getAttribute("data-theme"));
    const obs = new MutationObserver(() => {
      applyFaviconHref(document.documentElement.getAttribute("data-theme"));
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  return null;
}
