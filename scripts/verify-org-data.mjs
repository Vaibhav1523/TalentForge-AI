/**
 * Smoke-check organization + scope queries against the live DB.
 * Run from frontend/:  node scripts/verify-org-data.mjs
 * Requires DATABASE_URL (e.g. from .env via shell export or `set -a && source .env && set +a`)
 */
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("Skip: DATABASE_URL not set");
        process.exit(0);
    }

    const orgCount = await prisma.organization.count();
    const withOrg = await prisma.user.count({
        where: { organizationId: { not: null }, userRole: UserRole.RECRUITER },
    });
    const jobsWithOrg = await prisma.job.count({ where: { organizationId: { not: null } } });

    console.log("Organizations:", orgCount);
    console.log("Recruiters linked to an org:", withOrg);
    console.log("Jobs with organizationId:", jobsWithOrg);

    const sampleOrg = await prisma.organization.findFirst({
        select: { id: true, slug: true, name: true },
    });
    if (sampleOrg) {
        const memberCount = await prisma.user.count({ where: { organizationId: sampleOrg.id } });
        const jobOr = await prisma.job.count({
            where: {
                OR: [
                    { organizationId: sampleOrg.id },
                    { companyUser: { organizationId: sampleOrg.id } },
                ],
            },
        });
        console.log(`Sample org "${sampleOrg.slug}": ${memberCount} members, ${jobOr} jobs (OR scope)`);
    }

    console.log("verify-org-data: OK");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
