import { headers } from "next/headers";
import { ImageResponse } from "next/og";

export const alt = "HookStep | Tech Talent Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function trimBase(u: string) {
    return u.replace(/\/$/, "");
}

/** Strip protocol and path; keep host[:port] for domains like hookstep.in or app.example.com:3000 */
function sanitizeAppDomain(raw: string | undefined): string | null {
    if (!raw?.trim()) return null;
    let s = raw.trim();
    s = s.replace(/^https?:\/\//i, "");
    const hostPart = s.split("/")[0]?.trim() ?? s.trim();
    return hostPart.replace(/\/$/, "") || null;
}

function hostFromEnvUrl(urlish: string | undefined): string | null {
    if (!urlish?.trim()) return null;
    try {
        const trimmed = urlish.trim();
        const u = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
        return u.hostname.toLowerCase() || null;
    } catch {
        return null;
    }
}

/** Hostnames that may be used with request headers (x-forwarded-host / host). */
function buildTrustedOgHostSet(): Set<string> {
    const hosts = new Set<string>();
    const add = (h: string | null | undefined) => {
        if (h) hosts.add(h.toLowerCase());
    };
    for (const part of (process.env.TRUSTED_OG_HOSTS ?? "").split(",")) {
        add(sanitizeAppDomain(part.trim())?.toLowerCase() ?? null);
    }
    add(hostFromEnvUrl(process.env.SITE_ORIGIN));
    add(hostFromEnvUrl(process.env.NEXT_PUBLIC_SITE_URL));
    add(sanitizeAppDomain(process.env.NEXT_PUBLIC_APP_DOMAIN)?.toLowerCase() ?? null);
    add(hostFromEnvUrl(process.env.NEXTAUTH_URL));
    add(sanitizeAppDomain(process.env.VERCEL_URL)?.toLowerCase() ?? null);
    return hosts;
}

function headerHostAllowed(hostHeader: string, trusted: Set<string>): boolean {
    const hostOnly = hostHeader.split(":")[0]?.trim().toLowerCase() ?? "";
    if (!hostOnly || trusted.size === 0) return false;
    return trusted.has(hostOnly);
}

/** Do not trust x-forwarded-proto for non-local hosts (avoid downgrades). */
function protoForAllowlistedHost(hostKey: string): "http" | "https" {
    if (hostKey === "localhost" || hostKey.endsWith(".local")) return "http";
    return "https";
}

/** Config-first origins, then header-derived URL only if host is allowlisted. */
async function candidateSiteBases(): Promise<string[]> {
    const out: string[] = [];
    const trustedHosts = buildTrustedOgHostSet();

    if (process.env.SITE_ORIGIN?.trim()) {
        out.push(trimBase(process.env.SITE_ORIGIN.trim()));
    }
    if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
        out.push(trimBase(process.env.NEXT_PUBLIC_SITE_URL.trim()));
    }
    const appDomain = sanitizeAppDomain(process.env.NEXT_PUBLIC_APP_DOMAIN);
    if (appDomain) {
        out.push(`https://${trimBase(appDomain)}`);
    }
    if (process.env.NEXTAUTH_URL?.trim()) {
        out.push(trimBase(process.env.NEXTAUTH_URL.trim()));
    }
    if (process.env.VERCEL_URL?.trim()) {
        out.push(`https://${trimBase(sanitizeAppDomain(process.env.VERCEL_URL) ?? process.env.VERCEL_URL.trim())}`);
    }

    try {
        const h = await headers();
        const hostHeader =
            h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host")?.trim() || "";
        const hostKey = hostHeader.split(":")[0]?.trim().toLowerCase() ?? "";
        if (hostHeader && headerHostAllowed(hostHeader, trustedHosts)) {
            const proto = protoForAllowlistedHost(hostKey);
            out.push(`${proto}://${hostHeader}`);
        }
    } catch {
        /* headers() unavailable in some static contexts */
    }

    return Array.from(new Set(out.filter(Boolean)));
}

async function loadLogoDataUrl(): Promise<string | null> {
    for (const base of await candidateSiteBases()) {
        try {
            const logoUrl = new URL("/brand/logo.png", `${base}/`);
            const res = await fetch(logoUrl.toString(), { next: { revalidate: 86_400 } });
            if (!res.ok) continue;
            const buf = Buffer.from(await res.arrayBuffer());
            return `data:image/png;base64,${buf.toString("base64")}`;
        } catch {
            continue;
        }
    }
    return null;
}

export default async function OpenGraphImage() {
    const logoSrc = await loadLogoDataUrl();

    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #050a0e 0%, #0f172a 100%)",
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "48px 64px",
                        border: "1px solid rgba(13,148,136,0.3)",
                        borderRadius: "24px",
                        background: "rgba(255,255,255,0.03)",
                    }}
                >
                    {logoSrc ? (
                        <img
                            src={logoSrc}
                            width={120}
                            height={120}
                            alt=""
                            style={{ objectFit: "contain", marginBottom: 20 }}
                        />
                    ) : null}
                    <div
                        style={{
                            fontSize: 28,
                            color: "#2dd4bf",
                            fontWeight: 800,
                            marginBottom: 16,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        HookStep
                    </div>
                    <div
                        style={{
                            fontSize: 36,
                            fontWeight: 700,
                            color: "#fff",
                            textAlign: "center",
                            lineHeight: 1.3,
                            maxWidth: 700,
                        }}
                    >
                        Connect top tech talent with world-class companies
                    </div>
                    <div
                        style={{
                            marginTop: 20,
                            fontSize: 18,
                            color: "rgba(255,255,255,0.6)",
                        }}
                    >
                        AI/ML · Full Stack · Data · DevOps · QA
                    </div>
                </div>
            </div>
        ),
        { ...size },
    );
}
