import prisma from "@/lib/prisma";

const ENV_ADMIN_EMAILS: Set<string> = new Set(
    (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
);

/**
 * True for users who may operate across all companies (aligned with /api/admin/team).
 * SUPER_ADMIN_EMAIL, ADMIN_EMAILS list, or User.isAdmin in the database.
 */
export async function isPlatformAdmin(email: string | undefined | null): Promise<boolean> {
    if (!email) return false;
    const lower = email.toLowerCase();
    if (ENV_ADMIN_EMAILS.has(lower)) return true;
    const superEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
    if (superEmail && lower === superEmail) return true;
    const user = await prisma.user.findFirst({
        where: { email: { equals: lower, mode: "insensitive" } },
        select: { isAdmin: true, isSuperAdmin: true },
    });
    return user?.isAdmin === true || user?.isSuperAdmin === true;
}
