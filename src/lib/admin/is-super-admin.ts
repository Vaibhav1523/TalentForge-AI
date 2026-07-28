import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdminByEmail } from "@/lib/admin/super-admin-core";

export { isSuperAdminByEmail } from "@/lib/admin/super-admin-core";

export async function isSuperAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return isSuperAdminByEmail(session?.user?.email);
}
