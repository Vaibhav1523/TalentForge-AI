import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import { cookies } from "next/headers";
import prisma from "./db";
import { Prisma, UserRole } from "@prisma/client";

const freeEmailDomains: string[] = require("free-email-domains");
const FREE_EMAIL_SET = new Set(freeEmailDomains);

function isPersonalEmail(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase();
    return !!domain && FREE_EMAIL_SET.has(domain);
}

const RECRUITER_ALLOWLIST: Set<string> = new Set(
    (process.env.RECRUITER_ALLOWLIST_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
);


export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_ID ?? "",
            clientSecret: process.env.GITHUB_SECRET ?? "",
            // GitHub's OAuth implementation does not support Google's/OpenID `prompt` values.
            // To pick a different GitHub account, sign out at github.com first, or pass `login` here when
            // you want to suggest a specific GitHub username (optional).
            authorization: {
                params: {
                    scope: "read:user user:email",
                },
            },
        }),
        // NextAuth v4 default LinkedIn provider targets the pre–Aug 2023 API. New apps must use
        // "Sign In with LinkedIn using OpenID Connect" — issuer + wellKnown fix ID token `iss` checks.
        LinkedInProvider({
            clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
            client: { token_endpoint_auth_method: "client_secret_post" },
            issuer: "https://www.linkedin.com/oauth",
            wellKnown: "https://www.linkedin.com/oauth/.well-known/openid-configuration",
            authorization: {
                params: {
                    scope: "openid profile email",
                    // OIDC: ask for authentication not older than 0s — some IdPs show sign-in again; LinkedIn may honor partially.
                    max_age: 0,
                },
            },
            profile(profile) {
                const p = profile as {
                    sub?: string;
                    name?: string;
                    email?: string;
                    picture?: string;
                };
                if (!p.sub) {
                    throw new Error("LinkedIn OIDC response missing required 'sub' claim");
                }
                return {
                    id: p.sub,
                    name: p.name ?? "",
                    email: p.email ?? null,
                    image: p.picture ?? null,
                };
            },
        }),
    ],
    callbacks: {
        signIn: async ({ user }) => {
            const roleCookie = (await cookies()).get("login_role")?.value;
            const email = user.email?.toLowerCase() ?? "";
            // Allowlisted emails bypass the business-email requirement.
            if (roleCookie === "recruiter" && !RECRUITER_ALLOWLIST.has(email) && isPersonalEmail(email)) {
                return "/?auth_error=business_email_required";
            }
            return true;
        },
        jwt: async ({ token, user, trigger, account }) => {
            if (account?.provider) {
                token.authProvider = account.provider;
            }
            if (user && user.email) {
                const roleCookie = (await cookies()).get("login_role")?.value;
                const emailLower = user.email.toLowerCase();
                let initialRole: UserRole = UserRole.CANDIDATE;
                if (RECRUITER_ALLOWLIST.has(emailLower) || roleCookie === "recruiter") {
                    initialRole = UserRole.RECRUITER;
                }

                let dbUser = await prisma.user.upsert({
                    where: { email: user.email },
                    update: {},
                    create: {
                        email: user.email,
                        name: user.name,
                        profileImageUrl: user.image,
                        userRole: initialRole,
                        roleSelectedAt: roleCookie === 'recruiter' || RECRUITER_ALLOWLIST.has(emailLower) ? new Date() : undefined,
                    },
                }).catch(async (err: unknown) => {
                    // P2002 can occur during a concurrent sign-in race; fall back to a plain lookup.
                    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                        const existing = await prisma.user.findUnique({ where: { email: user.email! } });
                        if (existing) return existing;
                        // User was deleted between the upsert conflict and the lookup — retry once.
                        try {
                            return await prisma.user.upsert({
                                where: { email: user.email! },
                                update: {},
                                create: {
                                    email: user.email!,
                                    name: user.name,
                                    profileImageUrl: user.image,
                                    userRole: initialRole,
                                    roleSelectedAt: roleCookie === 'recruiter' || RECRUITER_ALLOWLIST.has(emailLower) ? new Date() : undefined,
                                },
                            });
                        } catch (retryErr) {
                            throw new Error(
                                "User deleted during concurrent sign-in; please retry. " +
                                String(retryErr)
                            );
                        }
                    }
                    throw err;
                });

                token.role = dbUser.userRole === UserRole.RECRUITER ? "recruiter" : "candidate";
                token.id = dbUser.id;
                token.email = user.email;
                const envSuper = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
                const withOrg = await prisma.user.findUnique({
                    where: { id: dbUser.id },
                    select: {
                        email: true,
                        isSuperAdmin: true,
                        onboardingComplete: true,
                        companySlug: true,
                        companyName: true,
                        companyLogoUrl: true,
                        organizationId: true,
                        organization: { select: { slug: true, name: true, logoUrl: true } },
                    },
                });
                const em = (withOrg?.email ?? user.email).toLowerCase();
                token.isPlatformSuperAdmin =
                    (!!envSuper && em === envSuper) || withOrg?.isSuperAdmin === true;
                token.adminFlagsAt = Date.now();
                token.onboardingComplete = withOrg?.onboardingComplete ?? false;
                token.organizationId = withOrg?.organizationId ?? null;
                token.companySlug = withOrg?.organization?.slug ?? withOrg?.companySlug ?? null;
                token.companyName =
                    withOrg?.organization?.name ?? withOrg?.companyName ?? null;
                token.companyLogoUrl =
                    withOrg?.organization?.logoUrl?.trim() ||
                    withOrg?.companyLogoUrl?.trim() ||
                    null;
            } else if (trigger === "update" && token.id) {
                const envSuper = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
                const fresh = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: {
                        email: true,
                        isSuperAdmin: true,
                        onboardingComplete: true,
                        companySlug: true,
                        companyName: true,
                        companyLogoUrl: true,
                        organizationId: true,
                        organization: { select: { slug: true, name: true, logoUrl: true } },
                    },
                });
                if (fresh) {
                    const em = fresh.email?.toLowerCase() ?? "";
                    token.isPlatformSuperAdmin =
                        (!!envSuper && em === envSuper) || fresh.isSuperAdmin === true;
                    token.adminFlagsAt = Date.now();
                    token.onboardingComplete = fresh.onboardingComplete ?? false;
                    token.organizationId = fresh.organizationId ?? null;
                    token.companySlug = fresh.organization?.slug ?? fresh.companySlug ?? null;
                    token.companyName = fresh.organization?.name ?? fresh.companyName ?? null;
                    token.companyLogoUrl =
                        fresh.organization?.logoUrl?.trim() ||
                        fresh.companyLogoUrl?.trim() ||
                        null;
                } else {
                    // User no longer exists — clear sensitive token fields to invalidate the session.
                    // Cast through Record to bypass strict typing on non-optional JWT fields.
                    const t = token as Record<string, unknown>;
                    t.id = undefined;
                    t.sub = undefined;
                    token.onboardingComplete = false;
                    token.companySlug = null;
                    token.companyName = null;
                    token.companyLogoUrl = null;
                    token.organizationId = null;
                }
            }

            // Refresh super-admin flags periodically so DB promotions apply without full re-login.
            const STALE_MS = 120_000;
            const tid = token.id as string | undefined;
            if (tid) {
                const now = Date.now();
                const last = (token as { adminFlagsAt?: number }).adminFlagsAt ?? 0;
                if (now - last > STALE_MS) {
                    const envSuper = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
                    try {
                        const u = await prisma.user.findUnique({
                            where: { id: tid },
                            select: { email: true, isSuperAdmin: true },
                        });
                        const em = u?.email?.toLowerCase() ?? (token.email as string | undefined)?.toLowerCase() ?? "";
                        token.isPlatformSuperAdmin =
                            (!!envSuper && em === envSuper) || u?.isSuperAdmin === true;
                        (token as { adminFlagsAt?: number }).adminFlagsAt = now;
                    } catch {
                        const em = (token.email as string | undefined)?.toLowerCase() ?? "";
                        token.isPlatformSuperAdmin = !!envSuper && em === envSuper;
                        (token as { adminFlagsAt?: number }).adminFlagsAt = now;
                    }
                }
            }

            return token;
        },
        session: async ({ session, token }) => {
            session.authProvider = token.authProvider as string | undefined;
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role;
                session.user.onboardingComplete = token.onboardingComplete as boolean;
                session.user.companySlug = token.companySlug as string | null | undefined;
                session.user.companyName = token.companyName as string | null | undefined;
                session.user.companyLogoUrl = token.companyLogoUrl as string | null | undefined;
                session.user.organizationId = token.organizationId as string | null | undefined;
            }
            return session;
        },
        redirect: async ({ url, baseUrl }) => {
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    pages: {
        signIn: '/sign-in',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
