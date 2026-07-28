import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const SA_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;
        const role = token?.role as string | undefined;
        const onboardingComplete = token?.onboardingComplete as boolean | undefined;
        const companySlug = token?.companySlug as string | null | undefined;
        const tokenSuper = (token as { isPlatformSuperAdmin?: boolean })?.isPlatformSuperAdmin === true;
        const isSuperAdmin =
            tokenSuper || (!!token?.email && (token.email as string).toLowerCase() === SA_EMAIL);

        // Admin routes: require authentication only (layout does the real admin check via DB)
        if (path.startsWith("/admin")) {
            if (!token?.email) {
                return NextResponse.redirect(new URL("/", req.url));
            }
            return NextResponse.next();
        }

        // Recruiters who haven't finished onboarding (or who have but have no slug yet)
        // get funnelled to /onboarding to complete/fix their profile.
        if (
            role === "recruiter" &&
            (onboardingComplete === false || !companySlug) &&
            !path.startsWith("/onboarding")
        ) {
            return NextResponse.redirect(new URL("/onboarding", req.url));
        }

        // ── Candidate-only routes ──────────────────────────────────────────────
        if (
            path.startsWith("/dashboard/jobs") ||
            path.startsWith("/dashboard/applications") ||
            /^\/dashboard\/[^/]+\/jobs\/[^/]+\/apply/.test(path)
        ) {
            if (role !== "candidate") {
                if (role === "recruiter" && companySlug) {
                    return NextResponse.redirect(new URL(`/c/${companySlug}`, req.url));
                }
                return NextResponse.redirect(new URL("/", req.url));
            }
        }

        // ── Company dashboard routes  /c/:slug/* ─────────────────────────────
        if (path.startsWith("/c/")) {
            const slug = path.split("/")[2];
            if (!slug) {
                return NextResponse.redirect(new URL("/", req.url));
            }

            if (isSuperAdmin) {
                return NextResponse.next();
            }

            const slugNorm = slug.trim().toLowerCase();
            const tokenSlugNorm = (companySlug ?? "").trim().toLowerCase();
            const isOwner =
                token && role === "recruiter" && tokenSlugNorm.length > 0 && tokenSlugNorm === slugNorm;

            if (!isOwner) {
                const rest = path.slice(`/c/${slug}`.length);

                // /c/:slug/jobs/:id — public job detail (page already handles this)
                if (/^\/jobs\/[^/]+$/.test(rest) && rest !== "/jobs/new") {
                    return NextResponse.next();
                }

                // JWT companySlug can lag behind DB (org slug / profile save). Confirm with server.
                if (token?.email) {
                    try {
                        const verify = new URL("/api/auth/match-company-route", req.nextUrl.origin);
                        verify.searchParams.set("slug", slug);
                        const res = await fetch(verify, {
                            headers: { cookie: req.headers.get("cookie") ?? "" },
                            cache: "no-store",
                        });
                        if (res.ok) {
                            const body = (await res.json()) as { allowed?: boolean };
                            if (body.allowed === true) {
                                return NextResponse.next();
                            }
                        }
                    } catch {
                        /* fall through to redirect */
                    }
                }

                // Everything else → public jobs page filtered by company
                return NextResponse.redirect(new URL(`/jobs?from=${slug}`, req.url));
            }

            return NextResponse.next();
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;
                if (pathname === '/jobs' || pathname.startsWith('/jobs/')) return true;
                if (pathname.startsWith('/c/')) return true;
                if (pathname === '/join') return true;
                return !!token;
            },
        },
        pages: {
            signIn: "/sign-in",
        },
    }
);

export const config = {
    matcher: [
        "/admin/:path*",
        "/admin",
        "/c/:path*",
        "/dashboard/:path*",
        "/onboarding/:path*",
        "/onboarding",
        "/join",
    ],
};
