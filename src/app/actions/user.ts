"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * Set user role in DB (for first-time choice only).
 * Once a user has a role (talent or recruiter), they cannot switch to the other.
 */
export async function updateUserRole(role: "recruiter" | "candidate") {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id as string | undefined;

    if (!userId) {
        throw new Error("Unauthorized - No user session found");
    }

    const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { userRole: true, roleSelectedAt: true },
    });

    if (!existing) {
        throw new Error("User not found");
    }

    // Allow role change only once (when roleSelectedAt is null, e.g. first sign-in without cookie)
    if (existing.roleSelectedAt != null) {
        redirect("/dashboard");
        return;
    }

    try {
        const newRole = role === "recruiter" ? UserRole.RECRUITER : UserRole.CANDIDATE;
        await prisma.user.update({
            where: { id: userId },
            data: { userRole: newRole, roleSelectedAt: new Date() },
        });
    } catch (error) {
        console.error("Failed to update user role:", error);
        throw new Error("Failed to update role. Please try again.");
    }

    redirect("/dashboard");
}
