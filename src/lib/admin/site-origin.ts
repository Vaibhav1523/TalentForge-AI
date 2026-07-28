import type { NextRequest } from "next/server";

/**
 * Public site origin for absolute links in exports and emails.
 * Prefer NEXTAUTH_URL, then https + NEXT_PUBLIC_APP_DOMAIN, then request URL.
 */
export function getSiteOriginFromRequest(req: NextRequest): string {
    const nu = process.env.NEXTAUTH_URL?.trim();
    if (nu) return nu.replace(/\/$/, "");
    const dom = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
    if (dom) {
        const host = dom.replace(/^https?:\/\//i, "").replace(/\/$/, "");
        return `https://${host}`;
    }
    return req.nextUrl.origin;
}
