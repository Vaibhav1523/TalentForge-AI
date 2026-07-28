import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/admin/require-admin";
import {
    applicationWhereForSelectedRecruiters,
    getAdminJobsMiniForDropdown,
    getAdminRecruitersFilterOptions,
} from "@/lib/admin/admin-data";
import {
    filterAdminJobsMiniByScope,
    parseAdminIdListParam,
    recruiterIdsForCompanyKeys,
} from "@/lib/admin/admin-filter-helpers";

function parseCTCNumber(val: string | null | undefined): number | null {
    if (!val) return null;
    const cleaned = val.replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

function sanitizeShortField(val: string | null | undefined, maxLen = 80): string {
    if (!val) return "";
    const trimmed = val.trim();
    if (trimmed.length > maxLen) return "";
    return trimmed;
}

type EnrichedCandidate = {
    id: string;
    name: string;
    email: string;
    skills: string[];
    phoneNumber: string;
    linkedin: string;
    github: string;
    currentCTC: string;
    expectedCTC: string;
    currentCurrency: string;
    expectedCurrency: string;
    noticePeriod: string;
    city: string;
    state: string;
    country: string;
    jobLocation: string;
    appliedJobs: string;
    latestStatus: string;
    resumeUrl: string;
    applicationCount: number;
    createdAt: string | null;
};

export async function GET(req: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const scope = sp.get("scope") ?? "all";
    const recruiterIds = parseAdminIdListParam(sp.get("recruiterId"));
    const jobIds = parseAdminIdListParam(sp.get("jobId"));
    const skillsParam = sp.get("skills");
    const locationParam = (sp.get("location") ?? "").trim().toLowerCase();
    const currencyParam = (sp.get("currency") ?? "").trim().toUpperCase();
    const minCTC = sp.get("minCTC") ? Number(sp.get("minCTC")) : null;
    const maxCTC = sp.get("maxCTC") ? Number(sp.get("maxCTC")) : null;
    const isExport = sp.get("export") === "true";
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const maxPageSize = isExport ? 10000 : 200;
    const pageSize = Math.min(maxPageSize, Math.max(1, Number(sp.get("pageSize") ?? 50)));

    const skills = skillsParam
        ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    const companyKeys = parseAdminIdListParam(sp.get("companyKey"));

    try {
        let candidateIdFilter: string[] | null = null;

        if (scope === "recruiter") {
            const recruiters = await getAdminRecruitersFilterOptions();
            const effectiveRecruiterIds =
                recruiterIds.length > 0
                    ? recruiterIds
                    : companyKeys.length > 0
                      ? recruiterIdsForCompanyKeys(recruiters, companyKeys)
                      : [];
            if (effectiveRecruiterIds.length === 0) {
                return NextResponse.json({ candidates: [], total: 0 });
            }
            const appWhere = applicationWhereForSelectedRecruiters(effectiveRecruiterIds, recruiters);
            const apps = await prisma.application.findMany({
                where: appWhere,
                select: { candidateId: true },
                distinct: ["candidateId"],
            });
            candidateIdFilter = apps.map((a) => a.candidateId);
        } else if (scope === "job") {
            let effectiveJobIds = jobIds;
            if (effectiveJobIds.length === 0) {
                if (companyKeys.length === 0) {
                    return NextResponse.json({ candidates: [], total: 0 });
                }
                const [recruiters, jobsMini] = await Promise.all([
                    getAdminRecruitersFilterOptions(),
                    getAdminJobsMiniForDropdown(),
                ]);
                const rids =
                    recruiterIds.length > 0
                        ? recruiterIds
                        : recruiterIdsForCompanyKeys(recruiters, companyKeys);
                effectiveJobIds = filterAdminJobsMiniByScope(
                    jobsMini,
                    recruiters,
                    companyKeys,
                    rids,
                    [],
                ).map((j) => j.id);
            }
            if (effectiveJobIds.length === 0) {
                return NextResponse.json({ candidates: [], total: 0 });
            }
            const apps = await prisma.application.findMany({
                where: { jobId: { in: effectiveJobIds } },
                select: { candidateId: true },
                distinct: ["candidateId"],
            });
            candidateIdFilter = apps.map((a) => a.candidateId);
        }

        if (candidateIdFilter !== null && candidateIdFilter.length === 0) {
            return NextResponse.json({ candidates: [], total: 0 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { userRole: "CANDIDATE" };

        if (candidateIdFilter) {
            where.id = { in: candidateIdFilter };
        }

        // Skills filter via candidate IDs who applied to jobs with matching skills
        if (skills.length > 0) {
            const matchingJobs = await prisma.job.findMany({
                where: { skills: { hasSome: skills } },
                select: { id: true },
            });
            const jobIds = matchingJobs.map((j) => j.id);

            const appsWithSkills = jobIds.length > 0
                ? await prisma.application.findMany({
                    where: { jobId: { in: jobIds } },
                    select: { candidateId: true },
                    distinct: ["candidateId"],
                })
                : [];

            const candidateIdsFromSkills = new Set(appsWithSkills.map((a) => a.candidateId));

            // Also include candidates who have skills on their profile
            const profileSkillUsers = await prisma.user.findMany({
                where: { userRole: "CANDIDATE", skills: { hasSome: skills } },
                select: { id: true },
            });
            profileSkillUsers.forEach((u) => candidateIdsFromSkills.add(u.id));

            if (candidateIdsFromSkills.size === 0) {
                return NextResponse.json({ candidates: [], total: 0 });
            }

            const skillIds = Array.from(candidateIdsFromSkills);
            if (where.id?.in) {
                where.id.in = where.id.in.filter((id: string) => candidateIdsFromSkills.has(id));
                if (where.id.in.length === 0) {
                    return NextResponse.json({ candidates: [], total: 0 });
                }
            } else {
                where.id = { in: skillIds };
            }
        }

        const allCandidates = await prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                skills: true,
                phoneNumber: true,
                linkedin: true,
                github: true,
                currentCTC: true,
                expectedCTC: true,
                noticePeriod: true,
                city: true,
                state: true,
                country: true,
                resumeUrl: true,
                createdAt: true,
                _count: { select: { applications: true } },
                applications: {
                    orderBy: { appliedAt: "desc" },
                    select: {
                        currentCTC: true,
                        expectedCTC: true,
                        currentCurrency: true,
                        expectedCurrency: true,
                        noticePeriod: true,
                        city: true,
                        status: true,
                        appliedAt: true,
                        job: {
                            select: { title: true, company: true, location: true, skills: true },
                        },
                    },
                },
            },
        });

        // Enrich first, then filter — so filters work on actual displayed values
        const enriched: EnrichedCandidate[] = allCandidates.map((c) => {
            const apps = c.applications;
            const latestApp = apps[0] ?? null;

            const pickFromApps = (field: "noticePeriod" | "currentCTC" | "expectedCTC" | "currentCurrency" | "expectedCurrency") =>
                apps.find((a) => a[field])?.[field] ?? "";

            const pickCityFromApps = (): string => {
                for (const a of apps) {
                    const v = sanitizeShortField(a.city, 80);
                    if (v) return v;
                }
                return "";
            };

            // Collect skills from profile + applied jobs
            const jobSkills = apps
                .filter((a) => a.job?.skills?.length)
                .flatMap((a) => a.job!.skills);
            const mergedSkills = Array.from(new Set([...c.skills, ...jobSkills]));

            const appliedJobs = apps
                .filter((a) => a.job)
                .map((a) => `${a.job!.title} (${a.job!.company})`)
                .filter((v, i, arr) => arr.indexOf(v) === i);

            const jobLocations = apps
                .filter((a) => a.job?.location)
                .map((a) => a.job!.location)
                .filter((v, i, arr) => arr.indexOf(v) === i);

            const latestStatus = latestApp?.status ?? "";

            const enrichedCity = sanitizeShortField(c.city, 80) || pickCityFromApps();

            return {
                id: c.id,
                name: c.name ?? "Unnamed",
                email: c.email,
                skills: mergedSkills,
                phoneNumber: c.phoneNumber ?? "",
                linkedin: c.linkedin ?? "",
                github: c.github ?? "",
                currentCTC: c.currentCTC || pickFromApps("currentCTC"),
                expectedCTC: c.expectedCTC || pickFromApps("expectedCTC"),
                currentCurrency: pickFromApps("currentCurrency"),
                expectedCurrency: pickFromApps("expectedCurrency"),
                noticePeriod: c.noticePeriod || pickFromApps("noticePeriod"),
                city: enrichedCity,
                state: c.state ?? "",
                country: c.country ?? "",
                jobLocation: jobLocations.join("; "),
                appliedJobs: appliedJobs.join("; "),
                latestStatus,
                resumeUrl: c.resumeUrl ?? "",
                applicationCount: c._count.applications,
                createdAt: c.createdAt?.toISOString() ?? null,
            };
        });

        // Apply all text/range filters on enriched data
        let filtered = enriched;

        if (locationParam) {
            filtered = filtered.filter((c) => {
                const candidateLocation = [c.city, c.country, c.state].join(" ").toLowerCase();
                return candidateLocation.includes(locationParam);
            });
        }

        if (currencyParam || minCTC !== null || maxCTC !== null) {
            filtered = filtered.filter((c) => {
                const currentNum = parseCTCNumber(c.currentCTC);
                const expectedNum = parseCTCNumber(c.expectedCTC);
                const curCur = c.currentCurrency.toUpperCase();
                const expCur = c.expectedCurrency.toUpperCase();

                const inRange = (n: number | null) => {
                    if (n === null) return false;
                    if (minCTC !== null && n < minCTC) return false;
                    if (maxCTC !== null && n > maxCTC) return false;
                    return true;
                };

                const hasRange = minCTC !== null || maxCTC !== null;

                const currentMatch =
                    (!currencyParam || curCur === currencyParam) &&
                    (!hasRange || inRange(currentNum));

                const expectedMatch =
                    (!currencyParam || expCur === currencyParam) &&
                    (!hasRange || inRange(expectedNum));

                return currentMatch || expectedMatch;
            });
        }

        const total = filtered.length;
        const candidates = filtered.slice((page - 1) * pageSize, page * pageSize);

        return NextResponse.json({ candidates, total });
    } catch (err) {
        console.error("[admin/candidates] Filter error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
