import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyAuth } from "@/lib/admin/resolve-company";

export const dynamic = "force-dynamic";

/**
 * Used by middleware when JWT `companySlug` may be stale vs the URL slug.
 * Returns whether the current session may use recruiter company routes under `/c/:slug`.
 */
export async function GET(req: NextRequest) {
    const slug = req.nextUrl.searchParams.get("slug")?.trim();
    if (!slug) {
        return NextResponse.json({ allowed: false }, { status: 400 });
    }
    const auth = await resolveCompanyAuth(slug);
    if (!auth.ok) {
        return NextResponse.json({ allowed: false }, { status: auth.status === 401 ? 401 : 403 });
    }
    return NextResponse.json({ allowed: true });
}
