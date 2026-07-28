import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSuperAdminByEmail } from "@/lib/admin/super-admin-core";
import { AdminSuppressSiteAurora } from "@/components/admin/AdminSuppressSiteAurora";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import "./admin.css";

const ENV_ADMIN_EMAILS: Set<string> = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export const metadata: Metadata = {
  title: "Admin Panel | HookStep",
  description: "HookStep admin panel",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) redirect("/");

  const isEnvAdmin = ENV_ADMIN_EMAILS.has(email);

  let isDbAdmin = false;
  if (!isEnvAdmin) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { isAdmin: true },
      });
      isDbAdmin = user?.isAdmin === true;
    } catch (err) {
      console.error("[AdminLayout] DB admin check failed:", err);
    }
  }

  if (!isEnvAdmin && !isDbAdmin) {
    redirect("/");
  }

  const isSuperAdmin = await isSuperAdminByEmail(email);

  const user = session!.user;
  const adminDisplayName =
    user.name?.trim() ||
    (email?.includes("@") ? email.split("@")[0].replace(/[._]+/g, " ") : "") ||
    email ||
    "Admin";
  const roleLabel = isSuperAdmin ? "Super admin" : "Admin";

  return (
    <>
      <AdminSuppressSiteAurora />
      <div className="admin-shell">
        <AdminSidebar
          isSuperAdmin={isSuperAdmin}
          userName={adminDisplayName}
          roleLabel={roleLabel}
        />
        <main className="admin-main">{children}</main>
      </div>
    </>
  );
}
