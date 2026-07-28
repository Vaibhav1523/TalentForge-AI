import type { Metadata } from "next";
import Link from "next/link";
import { SITE_LOGO_SRC } from "@/lib/site-brand";

export const metadata: Metadata = {
    title: "LinkedIn sign-in help | HookStep",
    description:
        "Clear your LinkedIn browser session so you can sign in to HookStep with a different account or see LinkedIn login again.",
    robots: { index: false, follow: false },
};

/**
 * LinkedIn does not offer a GitHub-style OAuth `prompt` for account picker / forced login.
 * Logging out of HookStep does not clear linkedin.com cookies. Sending users through LinkedIn’s
 * own sign-out URL is the reliable way to get credentials / account choice on the next OAuth hop.
 */
export default function LinkedInClearPage() {
    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header" style={{ marginBottom: 24 }}>
                    <Link href="/" className="auth-logo" aria-label="HookStep home">
                        <img
                            className="auth-logo-icon"
                            src={SITE_LOGO_SRC}
                            alt=""
                            width={48}
                            height={48}
                            decoding="async"
                        />
                    </Link>
                </div>
                <h1 className="auth-title" style={{ fontSize: "1.35rem" }}>
                    Sign in with LinkedIn again
                </h1>
                <p className="auth-subtitle" style={{ textAlign: "left", marginTop: "12px" }}>
                    Logging out of HookStep only ends your session here. LinkedIn still keeps you signed
                    in on <strong>linkedin.com</strong>, so the next &quot;Continue with LinkedIn&quot; can skip
                    the password screen.
                </p>
                <p className="auth-subtitle" style={{ textAlign: "left", marginTop: "10px" }}>
                    To use another LinkedIn account or see LinkedIn ask for login again, sign out on
                    LinkedIn first (same browser tab is best), then return and choose Continue with LinkedIn.
                </p>
                <a
                    href="https://www.linkedin.com/m/logout"
                    className="auth-provider-btn linkedin"
                    style={{ marginTop: "20px", textDecoration: "none", display: "flex", width: "100%", boxSizing: "border-box" as const }}
                >
                    Sign out on LinkedIn
                </a>
                <p className="auth-footer" style={{ marginTop: "20px" }}>
                    After LinkedIn signs you out,{" "}
                    <Link href="/sign-in">go back to HookStep sign-in</Link>.
                </p>
                <Link href="/sign-in" className="auth-back">
                    ← Back to sign-in
                </Link>
            </div>
        </div>
    );
}
