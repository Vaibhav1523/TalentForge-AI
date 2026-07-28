"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { SITE_LOGO_SRC } from "@/lib/site-brand";

function JoinLogo() {
    return (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
            <Link href="/" aria-label="HookStep home" style={{ display: "inline-flex" }}>
                <img
                    className="site-logo-light-theme"
                    src={SITE_LOGO_SRC}
                    alt=""
                    width={44}
                    height={44}
                    style={{ objectFit: "contain" }}
                    decoding="async"
                />
            </Link>
        </div>
    );
}

function JoinInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session, status, update } = useSession();
    const token = searchParams.get("token")?.trim() ?? "";
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setMessage("Missing invite link. Ask your admin for a new invitation.");
        }
    }, [token]);

    async function accept() {
        if (!token) return;
        setBusy(true);
        setMessage("");
        try {
            const res = await fetch("/api/organization/invites/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage(data.error || "Could not accept invite");
                setBusy(false);
                return;
            }
            await update();
            const slug = data.companySlug as string | undefined;
            router.push(slug ? `/c/${slug}` : "/");
        } catch {
            setMessage("Something went wrong. Try again.");
        } finally {
            setBusy(false);
        }
    }

    if (!token) {
        return (
            <main style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
                <JoinLogo />
                <h1 style={{ fontSize: 22, marginBottom: 12 }}>Invalid invite</h1>
                <p style={{ color: "#64748b" }}>{message}</p>
                <Link href="/" style={{ display: "inline-block", marginTop: 16 }}>
                    ← Home
                </Link>
            </main>
        );
    }

    if (status === "loading") {
        return (
            <main style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
                <JoinLogo />
                <p>Loading…</p>
            </main>
        );
    }

    if (status === "unauthenticated") {
        return (
            <main style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
                <JoinLogo />
                <h1 style={{ fontSize: 22, marginBottom: 12 }}>Join your team</h1>
                <p style={{ color: "#64748b", marginBottom: 20 }}>
                    Sign in with the email address that received the invite, then you&apos;ll be added to the
                    organization.
                </p>
                <button
                    type="button"
                    className="btn primary"
                    style={{ padding: "10px 18px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
                    onClick={() =>
                        signIn(undefined, { callbackUrl: `/join?token=${encodeURIComponent(token)}` })
                    }
                >
                    Sign in to continue
                </button>
            </main>
        );
    }

    return (
        <main style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
            <JoinLogo />
            <h1 style={{ fontSize: 22, marginBottom: 12 }}>Join your team</h1>
            <p style={{ color: "#64748b", marginBottom: 20 }}>
                Signed in as <strong>{session?.user?.email}</strong>. Accept the invitation to access your
                company dashboard.
            </p>
            {message ? (
                <p style={{ color: "#b91c1c", marginBottom: 16 }}>{message}</p>
            ) : null}
            <button
                type="button"
                disabled={busy}
                className="btn primary"
                style={{ padding: "10px 18px", borderRadius: 8, fontWeight: 600, cursor: busy ? "wait" : "pointer" }}
                onClick={() => void accept()}
            >
                {busy ? "Joining…" : "Accept invitation"}
            </button>
        </main>
    );
}

export default function JoinPage() {
    return (
        <Suspense
            fallback={
                <main style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
                    <JoinLogo />
                    <p>Loading…</p>
                </main>
            }
        >
            <JoinInner />
        </Suspense>
    );
}
