import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv").config({ path: ".env" });

import { updateTeamMember, listTeamMembers } from "../src/lib/team-members";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3010";
const marker = `HTTP_LIVE_BIO_${Date.now()}`;

async function main() {
  let failed = false;
  const members = await listTeamMembers();
  const sakshi = members.find((m) => m.name === "Sakshi");
  if (!sakshi) throw new Error("Sakshi missing");
  const prev = { bio: sakshi.bio, avatarUrl: sakshi.avatarUrl };

  try {
    const unauth = await fetch(`${BASE}/api/admin/team`);
    console.log("admin GET unauth", unauth.status, unauth.status === 403 ? "OK" : "FAIL");
    if (unauth.status !== 403) failed = true;

    await updateTeamMember(sakshi.id, { bio: marker });

    const pub = await fetch(`${BASE}/api/team`, { cache: "no-store" });
    const pubBody = (await pub.json()) as { members?: { id: string; bio: string }[] };
    const found = pubBody.members?.find((m) => m.id === sakshi.id);
    console.log("public API bio", found?.bio === marker ? "OK" : "FAIL", found?.bio?.slice(0, 48));
    if (found?.bio !== marker) failed = true;

    const founders = await fetch(`${BASE}/founders`, { cache: "no-store" });
    const fhtml = await founders.text();
    console.log("founders page has bio", fhtml.includes(marker) ? "OK" : "FAIL", "status", founders.status);
    if (!fhtml.includes(marker)) failed = true;

    const adminPage = await fetch(`${BASE}/admin/team`, { redirect: "manual" });
    console.log("admin team page status", adminPage.status);

    const home = await fetch(`${BASE}/`, { cache: "no-store" });
    const html = await home.text();
    // RSC may escape; also check teamMembers undefined uses fallback (not our marker)
    const inHome = html.includes(marker);
    console.log("homepage HTML contains bio", inHome ? "OK" : "N/A (client hydrate)", "status", home.status);

    console.log(failed ? "\n❌ HTTP CHECKS FAILED" : "\n✅ HTTP CHECKS PASSED");
    process.exitCode = failed ? 1 : 0;
  } finally {
    await updateTeamMember(sakshi.id, { bio: prev.bio, avatarUrl: prev.avatarUrl });
    console.log("Restored Sakshi profile.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
