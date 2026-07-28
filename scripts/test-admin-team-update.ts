/**
 * End-to-end verification for admin team profile updates.
 * Run from frontend/: npx tsx scripts/test-admin-team-update.ts
 */
import { createRequire } from "module";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
try {
  require("dotenv").config({ path: ".env" });
} catch {
  /* optional */
}

async function main() {
  const prisma = new PrismaClient();
  const marker = `Admin panel test bio ${Date.now()}`;
  let memberId = "";
  let original: { bio: string; role: string; avatarUrl: string | null; name: string } | null = null;
  const localFile = `test-upload-${Date.now()}.png`;

  try {
    console.log("1) Load team members…");
    const members = await prisma.teamMember.findMany({ orderBy: { sortOrder: "asc" } });
    if (members.length === 0) throw new Error("No team members — run: npx tsx prisma/seed-team.ts");
    const target = members.find((m) => m.name === "Sakshi") ?? members[0];
    memberId = target.id;
    original = {
      bio: target.bio,
      role: target.role,
      avatarUrl: target.avatarUrl,
      name: target.name,
    };
    console.log(`   OK — ${members.length} members; editing ${target.name}`);

    console.log("2) updateTeamMember service (same as admin Save)…");
    const { updateTeamMember, listTeamMembers } = await import("../src/lib/team-members");
    const updated = await updateTeamMember(memberId, {
      bio: marker,
      role: "Head of Sales",
      name: target.name,
      iconName: "TrendingUp",
    });
    if (updated.bio !== marker) throw new Error("Service did not persist bio");
    console.log("   OK — profile fields updated");

    console.log("3) listTeamMembers returns the change…");
    const listed = await listTeamMembers();
    const found = listed.find((m) => m.id === memberId);
    if (!found || found.bio !== marker) throw new Error("listTeamMembers missing update");
    console.log("   OK — list reflects admin edit");

    console.log("4) Validation rejects empty name…");
    let rejected = false;
    try {
      await updateTeamMember(memberId, { name: "   " });
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error("Empty name should fail");
    console.log("   OK — empty name rejected");

    console.log("5) Local photo path (admin upload fallback target)…");
    const dir = path.join(process.cwd(), "public", "team");
    await mkdir(dir, { recursive: true });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    await writeFile(path.join(dir, localFile), png);
    await updateTeamMember(memberId, { avatarUrl: `/team/${localFile}` });
    const withPhoto = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (withPhoto?.avatarUrl !== `/team/${localFile}`) throw new Error("avatarUrl not saved");
    console.log("   OK — avatarUrl set to local team photo");

    console.log("6) Public API module returns updated roster…");
    // Simulate what /api/team does
    const publicMembers = await listTeamMembers();
    if (!publicMembers.some((m) => m.bio === marker)) {
      throw new Error("Public roster missing updated bio");
    }
    console.log(`   OK — public roster has ${publicMembers.length} members with new bio`);

    console.log("7) isPlatformAdmin helpers…");
    const { isPlatformAdmin } = await import("../src/lib/admin/is-platform-admin");
    if (await isPlatformAdmin(null)) throw new Error("null email must not be admin");
    const configured =
      (process.env.SUPER_ADMIN_EMAIL || "").trim() ||
      (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim();
    if (configured) {
      const ok = await isPlatformAdmin(configured);
      if (!ok) throw new Error(`Configured admin ${configured} not recognized by isPlatformAdmin`);
      console.log(`   OK — ${configured} is admin`);
    } else {
      console.log("   SKIP — no ADMIN_EMAILS/SUPER_ADMIN_EMAIL in env");
    }

    console.log("\n✅ ALL ADMIN TEAM UPDATE TESTS PASSED");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    if (memberId && original) {
      await prisma.teamMember
        .update({
          where: { id: memberId },
          data: {
            bio: original.bio,
            role: original.role,
            avatarUrl: original.avatarUrl ?? "/team/sakshi.png",
            name: original.name,
          },
        })
        .catch(() => undefined);
      console.log("Restored original profile fields.");
    }
    await unlink(path.join(process.cwd(), "public", "team", localFile)).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main();
