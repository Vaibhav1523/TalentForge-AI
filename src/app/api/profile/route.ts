import { NextResponse } from 'next/server';
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { api500 } from "@/lib/apiError";
import { toSlug, isValidSlug, RESERVED_SLUGS } from "@/lib/slug";
import { UserRole } from "@prisma/client";
import { syncRecruiterOrganizationFromProfile } from "@/lib/organization-sync";
import { isPlatformAdmin } from "@/lib/admin/is-platform-admin";
import { viewedCompanyScopeFromSlug } from "@/lib/admin/viewed-company-from-slug";

export const dynamic = "force-dynamic";

type OrgBranding = {
    slug: string;
    name: string;
    logoUrl: string | null;
    website: string | null;
};

/**
 * Recruiters in an org store branding on `Organization`; JWT uses org-first values.
 * Settings loads `/api/profile` — without this merge, `User.company*` can disagree with
 * `Organization.slug`/name (e.g. after a slug conflict) while `/c/:orgSlug` still works.
 */
function profileResponseBody<T extends { organization: OrgBranding | null } & Record<string, unknown>>(
    user: T
) {
    const { organization: org, ...rest } = user;
    return {
        ...rest,
        companyName: org?.name ?? (rest.companyName as string | null) ?? null,
        companyWebsite: org?.website ?? (rest.companyWebsite as string | null) ?? null,
        companyLogoUrl:
            org?.logoUrl?.trim() || String((rest.companyLogoUrl as string | null) ?? "").trim() || null,
        companySlug: org?.slug ?? (rest.companySlug as string | null) ?? null,
    };
}

const profileSelect = {
    name: true,
    email: true,
    profileImageUrl: true,
    phoneNumber: true,
    country: true,
    state: true,
    city: true,
    linkedin: true,
    github: true,
    twitter: true,
    currentCTC: true,
    expectedCTC: true,
    noticePeriod: true,
    resumeUrl: true,
    companyLogoUrl: true,
    companyName: true,
    companyWebsite: true,
    companySlug: true,
    hiresFor: true,
    onboardingComplete: true,
    notificationNewApplications: true,
    notificationInterviewUpdates: true,
    notificationPlatformNews: true,
    organizationId: true,
    organizationRole: true,
    organization: {
        select: { slug: true, name: true, logoUrl: true, website: true },
    },
};

async function buildProfileJson(
    sessionUserId: string,
    sessionEmail: string | null | undefined,
    viewCompanySlug: string | null,
): Promise<Record<string, unknown> | null> {
    const me = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: profileSelect,
    });
    if (!me) return null;

    const base = profileResponseBody(
        me as { organization: OrgBranding | null } & Record<string, unknown>,
    ) as Record<string, unknown>;
    const slug = viewCompanySlug?.trim() ?? "";
    if (!slug || !(await isPlatformAdmin(sessionEmail))) {
        return base;
    }

    const scope = await viewedCompanyScopeFromSlug(slug);
    if (!scope) return null;

    if (scope.kind === "organization") {
        const org = await prisma.organization.findUnique({
            where: { id: scope.organizationId },
            select: { id: true, slug: true, name: true, website: true, logoUrl: true },
        });
        if (!org) return null;
        return {
            ...base,
            companyName: org.name,
            companyWebsite: org.website ?? null,
            companyLogoUrl: org.logoUrl?.trim() || null,
            companySlug: org.slug,
            organizationId: org.id,
            organizationRole: "OWNER",
        };
    }

    const legacy = await prisma.user.findUnique({
        where: { id: scope.profileWriteUserId },
        select: profileSelect,
    });
    if (!legacy) return null;
    const merged = profileResponseBody(
        legacy as { organization: OrgBranding | null } & Record<string, unknown>,
    ) as Record<string, unknown>;
    return {
        ...base,
        companyName: merged.companyName,
        companyWebsite: merged.companyWebsite,
        companyLogoUrl: merged.companyLogoUrl,
        companySlug: merged.companySlug,
        organizationId: merged.organizationId,
        organizationRole: merged.organizationRole ?? "OWNER",
    };
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const viewCompanySlug = req.nextUrl.searchParams.get("companySlug")?.trim() ?? "";
        const body = await buildProfileJson(
            session.user.id,
            session.user.email,
            viewCompanySlug.length > 0 ? viewCompanySlug : null,
        );
        if (!body) {
            return NextResponse.json({ error: "User or company not found" }, { status: 404 });
        }

        return NextResponse.json(body);
    } catch (error) {
        return api500("Failed to fetch profile", "GET profile", error);
    }
}

const MAX_STRING = 500;
const MAX_URL = 2048;

function trim(s: unknown): string | undefined {
    if (s == null) return undefined;
    const t = String(s).trim();
    return t.length > 0 ? t.slice(0, MAX_STRING) : undefined;
}

function validUrl(s: unknown): string | null | undefined {
    if (s == null || s === "") return undefined;
    const u = String(s).trim().slice(0, MAX_URL);
    try {
        const parsed = new URL(u);
        return ["http:", "https:"].includes(parsed.protocol) ? u : null;
    } catch {
        return null;
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const viewCompanySlug = new URL(req.url).searchParams.get("companySlug")?.trim() ?? "";
        const platformAdmin = await isPlatformAdmin(session.user.email);
        const viewedScope =
            viewCompanySlug && platformAdmin
                ? await viewedCompanyScopeFromSlug(viewCompanySlug)
                : null;

        const actingUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { userRole: true, organizationId: true, organizationRole: true },
        });
        const orgMemberReadOnly =
            actingUser?.userRole === UserRole.RECRUITER &&
            !!actingUser.organizationId &&
            actingUser.organizationRole === "MEMBER" &&
            !(platformAdmin && viewCompanySlug && viewedScope);

        const data = await req.json().catch(() => ({}));
        if (typeof data !== "object" || data === null) {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }

        if (orgMemberReadOnly) {
            const attemptedRestrictedChanges =
                "companyName" in data ||
                "companySlug" in data ||
                "companyWebsite" in data ||
                "companyLogoUrl" in data;
            if (attemptedRestrictedChanges) {
                return NextResponse.json(
                    {
                        error:
                            "Company profile fields can only be changed by an organization owner or admin.",
                    },
                    { status: 403 },
                );
            }
        }

        const linkedinUrl = validUrl(data.linkedin);
        const githubUrl = validUrl(data.github);
        const twitterUrl = validUrl(data.twitter);
        if (linkedinUrl === null || githubUrl === null || twitterUrl === null) {
            return NextResponse.json({ error: "Invalid URL: only http/https allowed" }, { status: 400 });
        }

        // profileImageUrl: accept http/https (OAuth avatars) or our GCS proxy path
        const PROFILE_IMAGE_PATH_RE = /^\/api\/images\/profile-images\/[^./][^/]*\.[a-z]{2,5}$/i;
        let profileImageUrlVal: string | null | undefined = undefined;
        if (data.profileImageUrl !== undefined) {
            const raw = String(data.profileImageUrl ?? "").trim();
            if (raw === "") {
                profileImageUrlVal = null;
            } else if (PROFILE_IMAGE_PATH_RE.test(raw)) {
                profileImageUrlVal = raw;
            } else {
                const checked = validUrl(raw);
                if (checked === null) {
                    return NextResponse.json({ error: "Invalid profile image URL" }, { status: 400 });
                }
                profileImageUrlVal = checked;
            }
        }

        const nameVal = trim(data.name);
        const phoneNumberVal = trim(data.phoneNumber);
        const countryVal = trim(data.country);
        const stateVal = trim(data.state);
        const cityVal = trim(data.city);
        const currentCTCVal = trim(data.currentCTC);
        const expectedCTCVal = trim(data.expectedCTC);
        const noticePeriodVal = trim(data.noticePeriod);
        const resumeUrlVal = validUrl(data.resumeUrl) ?? (data.resumeUrl === '' ? '' : undefined);
        if (resumeUrlVal === null) {
            return NextResponse.json({ error: "Invalid resume URL: only http/https allowed" }, { status: 400 });
        }

        // companyLogoUrl: accept our internal proxy paths only (/api/images/logos/... or /api/images/team/...)
        // External http/https URLs are not accepted here — logo must be uploaded via /api/upload/company-logo
        const LOGO_PATH_RE = /^\/api\/images\/(logos|team)\/[^./][^/]*\.[a-z]{2,5}$/i;
        let companyLogoUrlVal: string | null | undefined = undefined;
        if (data.companyLogoUrl !== undefined) {
            const raw = String(data.companyLogoUrl ?? "").trim();
            if (raw === "") {
                companyLogoUrlVal = null;
            } else if (LOGO_PATH_RE.test(raw)) {
                companyLogoUrlVal = raw;
            } else {
                return NextResponse.json({ error: "Invalid company logo URL — use /api/upload/company-logo to upload" }, { status: 400 });
            }
        }
        const notificationNewApplicationsVal = data.notificationNewApplications === true || data.notificationNewApplications === false ? data.notificationNewApplications : undefined;
        const notificationInterviewUpdatesVal = data.notificationInterviewUpdates === true || data.notificationInterviewUpdates === false ? data.notificationInterviewUpdates : undefined;
        const notificationPlatformNewsVal = data.notificationPlatformNews === true || data.notificationPlatformNews === false ? data.notificationPlatformNews : undefined;

        const companyNameVal = trim(data.companyName);
        const companyWebsiteVal = validUrl(data.companyWebsite);
        if (companyWebsiteVal === null) {
            return NextResponse.json({ error: "Invalid company website URL: only http/https allowed" }, { status: 400 });
        }
        const hiresForVal: string[] | undefined =
            Array.isArray(data.hiresFor)
                ? (data.hiresFor as unknown[]).map((v) => trim(String(v))).filter((s): s is string => Boolean(s)).slice(0, 20)
                : undefined;
        const onboardingCompleteVal = data.onboardingComplete === true ? true : undefined;

        const hasCompanyMutation =
            companyNameVal !== undefined ||
            "companySlug" in data ||
            "companyWebsite" in data ||
            "companyLogoUrl" in data;

        if (hasCompanyMutation && platformAdmin && viewCompanySlug && !viewedScope) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        const delegateCompanyAway =
            hasCompanyMutation && platformAdmin && Boolean(viewCompanySlug && viewedScope);

        const companyWriteUserId =
            delegateCompanyAway && viewedScope ? viewedScope.profileWriteUserId : session.user.id;

        // companySlug: only set/change when explicitly provided, OR auto-generate on first-time setup (no existing slug).
        // Once a slug is established, it only changes if the user explicitly sends a new one — this keeps URLs stable.
        let companySlugVal: string | undefined = undefined;
        if (data.companySlug !== undefined || companyNameVal !== undefined) {
            // Check if the user already has a slug in the DB
            const currentUser = await prisma.user.findUnique({
                where: { id: companyWriteUserId },
                select: { companySlug: true, organizationId: true },
            });
            const hasExistingSlug = !!currentUser?.companySlug;

            // Only auto-generate from companyName when the user doesn't have a slug yet,
            // or when an explicit new slug is provided.
            const rawSlug = data.companySlug
                ? String(data.companySlug).trim()
                : hasExistingSlug ? undefined : toSlug(companyNameVal ?? "");

            if (rawSlug) {
                if (RESERVED_SLUGS.has(rawSlug)) {
                    return NextResponse.json({ error: `"${rawSlug}" is a reserved name. Please use a different company name.` }, { status: 400 });
                }
                if (!isValidSlug(rawSlug)) {
                    return NextResponse.json({ error: "Invalid slug: use lowercase letters, numbers, and hyphens only (2–48 chars)." }, { status: 400 });
                }
                const orgWithSlug = await prisma.organization.findUnique({
                    where: { slug: rawSlug },
                    select: { id: true },
                });
                if (orgWithSlug && orgWithSlug.id !== currentUser?.organizationId) {
                    return NextResponse.json(
                        { error: `The slug "${rawSlug}" is already taken. Try a variation.` },
                        { status: 409 },
                    );
                }
                companySlugVal = rawSlug;
            }
        }

        try {
            await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    ...(nameVal !== undefined && { name: nameVal }),
                    ...(phoneNumberVal !== undefined && { phoneNumber: phoneNumberVal }),
                    ...(countryVal !== undefined && { country: countryVal }),
                    ...(stateVal !== undefined && { state: stateVal }),
                    ...(cityVal !== undefined && { city: cityVal }),
                    ...(linkedinUrl !== undefined && { linkedin: linkedinUrl }),
                    ...(githubUrl !== undefined && { github: githubUrl }),
                    ...(twitterUrl !== undefined && { twitter: twitterUrl }),
                    ...(currentCTCVal !== undefined && { currentCTC: currentCTCVal }),
                    ...(expectedCTCVal !== undefined && { expectedCTC: expectedCTCVal }),
                    ...(noticePeriodVal !== undefined && { noticePeriod: noticePeriodVal }),
                    ...(resumeUrlVal !== undefined && { resumeUrl: resumeUrlVal || null }),
                    ...(profileImageUrlVal !== undefined && { profileImageUrl: profileImageUrlVal }),
                    ...(!delegateCompanyAway &&
                        !orgMemberReadOnly &&
                        companyLogoUrlVal !== undefined && { companyLogoUrl: companyLogoUrlVal ?? null }),
                    ...(notificationNewApplicationsVal !== undefined && { notificationNewApplications: notificationNewApplicationsVal }),
                    ...(notificationInterviewUpdatesVal !== undefined && { notificationInterviewUpdates: notificationInterviewUpdatesVal }),
                    ...(notificationPlatformNewsVal !== undefined && { notificationPlatformNews: notificationPlatformNewsVal }),
                    ...(!delegateCompanyAway &&
                        !orgMemberReadOnly &&
                        companyNameVal !== undefined && { companyName: companyNameVal }),
                    ...(!delegateCompanyAway &&
                        !orgMemberReadOnly &&
                        companyWebsiteVal !== undefined && { companyWebsite: companyWebsiteVal }),
                    ...(!delegateCompanyAway &&
                        !orgMemberReadOnly &&
                        companySlugVal !== undefined && { companySlug: companySlugVal }),
                    ...(hiresForVal !== undefined && { hiresFor: hiresForVal }),
                    ...(onboardingCompleteVal !== undefined && { onboardingComplete: true }),
                },
            });
            if (delegateCompanyAway && viewedScope) {
                await prisma.user.update({
                    where: { id: viewedScope.profileWriteUserId },
                    data: {
                        ...(companyLogoUrlVal !== undefined && { companyLogoUrl: companyLogoUrlVal ?? null }),
                        ...(companyNameVal !== undefined && { companyName: companyNameVal }),
                        ...(companyWebsiteVal !== undefined && { companyWebsite: companyWebsiteVal }),
                        ...(companySlugVal !== undefined && { companySlug: companySlugVal }),
                    },
                });
            }
        } catch (updateErr) {
            if (
                updateErr instanceof Prisma.PrismaClientKnownRequestError &&
                updateErr.code === "P2002" &&
                companySlugVal
            ) {
                return NextResponse.json(
                    { error: `The slug "${companySlugVal}" is already taken. Try a variation.` },
                    { status: 409 }
                );
            }
            throw updateErr;
        }

        let orgSyncSlugConflict: { slug: string } | null = null;
        const syncUserId = delegateCompanyAway && viewedScope ? viewedScope.profileWriteUserId : session.user.id;
        const syncSubject = await prisma.user.findUnique({
            where: { id: syncUserId },
            select: { userRole: true },
        });
        if (syncSubject?.userRole === UserRole.RECRUITER) {
            const syncResult = await syncRecruiterOrganizationFromProfile({
                userId: syncUserId,
                companyName: orgMemberReadOnly ? undefined : companyNameVal,
                companySlug: orgMemberReadOnly ? undefined : companySlugVal,
                companyWebsite: orgMemberReadOnly ? undefined : companyWebsiteVal,
                companyLogoUrl: orgMemberReadOnly ? undefined : companyLogoUrlVal,
                onboardingCompleting: delegateCompanyAway ? undefined : onboardingCompleteVal === true,
            });
            if (!syncResult.ok && syncResult.reason === "slug_conflict") {
                orgSyncSlugConflict = { slug: syncResult.slug };
            }
        }

        /** Tenant row for slug/name in responses — org owner when platform admin uses `?companySlug=`. */
        const profileSubjectId =
            platformAdmin && viewedScope ? viewedScope.profileWriteUserId : session.user.id;
        const writerRow = await prisma.user.findUnique({
            where: { id: profileSubjectId },
            select: {
                companySlug: true,
                organization: { select: { slug: true } },
            },
        });
        const canonicalCompanySlug =
            writerRow?.organization?.slug ?? writerRow?.companySlug ?? null;

        /** After a slug rename, the request `companySlug` query is stale; rebuild JSON using the DB slug. */
        let slugForResponse: string | null = null;
        if (platformAdmin && viewCompanySlug && viewedScope) {
            slugForResponse = canonicalCompanySlug ?? viewCompanySlug;
        }

        const bodyBase = await buildProfileJson(
            session.user.id,
            session.user.email,
            slugForResponse && slugForResponse.length > 0 ? slugForResponse : null,
        );
        if (!bodyBase) {
            return NextResponse.json({ error: "Failed to read profile after save" }, { status: 500 });
        }
        if (canonicalCompanySlug) {
            (bodyBase as { companySlug?: string | null }).companySlug = canonicalCompanySlug;
        }
        if (orgSyncSlugConflict) {
            return NextResponse.json(
                {
                    ...bodyBase,
                    profileUpdated: true,
                    syncOk: false,
                    error: "slug_conflict",
                    conflictSlug: orgSyncSlugConflict.slug,
                    message:
                        "Profile saved but organization sync failed: slug already taken.",
                },
                { status: 200 },
            );
        }
        return NextResponse.json(bodyBase);
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
        ) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return api500("Failed to update profile", "PUT profile", error);
    }
}
