import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/require-admin";
import {
    getAdminJobsMiniForDropdown,
    getAdminRecruitersFilterOptions,
} from "@/lib/admin/admin-data";
import {
    companyKeyForRecruiter,
    filterAdminJobsMiniByScope,
    parseAdminIdListParam,
    toCascadeRecruiterRows,
} from "@/lib/admin/admin-filter-helpers";

/**
 * Cascading scope data (companies → recruiters → jobs). companyKey may be comma-separated.
 */
export async function GET(req: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const companyKeys = parseAdminIdListParam(sp.get("companyKey"));
    const recruiterIds = parseAdminIdListParam(sp.get("recruiterId"));
    const includeJobs = sp.get("includeJobs") !== "0";

    try {
        const [recruitersAll, jobsMini] = await Promise.all([
            getAdminRecruitersFilterOptions(),
            includeJobs ? getAdminJobsMiniForDropdown() : Promise.resolve([]),
        ]);

        const recruitersForDropdown =
            companyKeys.length > 0
                ? recruitersAll.filter((r) =>
                      companyKeys.some((ck) => companyKeyForRecruiter(r) === ck),
                  )
                : recruitersAll;

        const jobsForDropdown = includeJobs
            ? filterAdminJobsMiniByScope(jobsMini, recruitersAll, companyKeys, recruiterIds, [])
            : [];

        return NextResponse.json({
            recruiters: toCascadeRecruiterRows(recruitersForDropdown),
            jobs: jobsForDropdown.map((j) => ({
                id: j.id,
                title: j.title,
                company: j.company,
            })),
        });
    } catch (err) {
        console.error("[admin/scope-filter-options]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
