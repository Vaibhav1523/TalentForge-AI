/**
 * One-time backfill: create Organization per solo recruiter, link users/jobs/applications.
 *
 * Usage (from frontend/):
 *   DATABASE_URL=... node scripts/migrate-organizations.mjs
 *
 * Or with dotenv-cli: npx dotenv -e .env -- node scripts/migrate-organizations.mjs
 */
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const recruiters = await prisma.user.findMany({
        where: { userRole: UserRole.RECRUITER, organizationId: null },
        select: {
            id: true,
            companySlug: true,
            companyName: true,
            companyLogoUrl: true,
            companyWebsite: true,
        },
    });

    console.log(`Found ${recruiters.length} recruiters without organizationId`);

    for (const u of recruiters) {
        const slug = (u.companySlug || "").trim();
        if (!slug) {
            console.warn(`Skip user ${u.id}: no companySlug`);
            continue;
        }

        const name = u.companyName?.trim() || slug;
        const org = await prisma.organization.upsert({
            where: { slug },
            create: {
                name,
                slug,
                logoUrl: u.companyLogoUrl ?? undefined,
                website: u.companyWebsite ?? undefined,
            },
            update: {},
        });
        console.log(`Org ${org.id} slug=${org.slug}`);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: u.id },
                data: {
                    organizationId: org.id,
                    organizationRole: "OWNER",
                },
            }),
            prisma.job.updateMany({
                where: { companyId: u.id },
                data: { organizationId: org.id },
            }),
            prisma.application.updateMany({
                where: { companyId: u.id },
                data: { organizationId: org.id },
            }),
        ]);
        console.log(`Linked user ${u.id} → org ${org.id}`);
    }

    console.log("Done.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
