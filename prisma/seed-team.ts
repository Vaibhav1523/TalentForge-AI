import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEAM_MEMBERS = [
  {
    name: "Saraswati",
    role: "CEO",
    bio: "Visionary CEO guiding HookStep's mission to connect world-class talent with AI-native companies.",
    avatarUrl: "/team/saraswati.png",
    iconName: "Brain",
    tilt: "tilt-left-1",
    featured: false,
    sortOrder: 0,
  },
  {
    name: "Mohan",
    role: "COO",
    bio: "Operations leader scaling HookStep's hiring engine—process, partnerships, and delivery excellence.",
    avatarUrl: "/team/mohan.png",
    iconName: "Briefcase",
    tilt: "tilt-center",
    featured: true,
    sortOrder: 1,
  },
  {
    name: "Sakshi",
    role: "Head of Sales",
    bio: "Building lasting client relationships and helping companies hire exceptional tech talent, fast.",
    avatarUrl: "/team/sakshi.png",
    iconName: "TrendingUp",
    tilt: "tilt-right-1",
    featured: false,
    sortOrder: 2,
  },
];

async function main() {
  await prisma.teamMember.deleteMany({});
  for (const m of TEAM_MEMBERS) {
    await prisma.teamMember.create({ data: m });
    console.log(`  + ${m.name} (${m.tilt}${m.featured ? ", featured" : ""})`);
  }
  console.log("Seeded", TEAM_MEMBERS.length, "team members.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
