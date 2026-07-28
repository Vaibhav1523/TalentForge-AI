import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ENV_ADMIN_EMAILS: Set<string> = new Set(
    (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
);

export async function isAdmin(): Promise<boolean> {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase();
    if (!email) return false;
    if (ENV_ADMIN_EMAILS.has(email)) return true;
    const user = await prisma.user.findUnique({
        where: { email },
        select: { isAdmin: true },
    });
    return user?.isAdmin === true;
}
