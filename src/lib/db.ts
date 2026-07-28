import { PrismaClient } from "@prisma/client";

/**
 * Before removing an organization, clear member org roles so `onDelete: SetNull` on
 * `User.organizationId` does not leave a stale `organizationRole`.
 */
function extendOrganizationDeletes(base: PrismaClient) {
    return base.$extends({
        query: {
            organization: {
                async delete({ args }) {
                    return base.$transaction(async (tx) => {
                        const rows = await tx.organization.findMany({
                            where: args.where,
                            select: { id: true },
                        });
                        const ids = rows.map((r) => r.id);
                        if (ids.length > 0) {
                            await tx.user.updateMany({
                                where: { organizationId: { in: ids } },
                                data: { organizationRole: null },
                            });
                        }
                        return tx.organization.delete(args);
                    });
                },
                async deleteMany({ args }) {
                    return base.$transaction(async (tx) => {
                        const rows = await tx.organization.findMany({
                            where: args.where ?? {},
                            select: { id: true },
                        });
                        const ids = rows.map((r) => r.id);
                        if (ids.length > 0) {
                            await tx.user.updateMany({
                                where: { organizationId: { in: ids } },
                                data: { organizationRole: null },
                            });
                        }
                        return tx.organization.deleteMany(args);
                    });
                },
            },
        },
    });
}

const prismaClientSingleton = () => {
    const base = new PrismaClient();
    return extendOrganizationDeletes(base);
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
