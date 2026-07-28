import prisma from "@/lib/prisma";

export function envSuperAdminEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

/** Env bootstrap super OR User.isSuperAdmin in the database. */
export async function isSuperAdminByEmail(email: string | null | undefined): Promise<boolean> {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const envSa = envSuperAdminEmail();
  if (envSa && e === envSa) return true;
  const u = await prisma.user.findFirst({
    where: { email: { equals: e, mode: "insensitive" } },
    select: { isSuperAdmin: true },
  });
  return u?.isSuperAdmin === true;
}

/**
 * True if revoking this user's DB admin (and clearing isSuperAdmin) would leave the product
 * with zero super-admins (no SUPER_ADMIN_EMAIL and no other User.isSuperAdmin).
 */
export async function wouldStripLastSuperAdmin(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const u = await prisma.user.findFirst({
    where: { email: { equals: e, mode: "insensitive" } },
    select: { isSuperAdmin: true },
  });
  if (!u?.isSuperAdmin) return false;
  const otherDbSupers = await prisma.user.count({
    where: {
      isSuperAdmin: true,
      NOT: { email: { equals: e, mode: "insensitive" } },
    },
  });
  if (otherDbSupers > 0) return false;
  const envSa = envSuperAdminEmail();
  if (envSa) return false;
  return true;
}
