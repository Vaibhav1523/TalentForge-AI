import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { HeroNav } from '@/components/HeroNav';
import { GlowBackground } from '@/components/GlowBackground';
import { MarketingAds } from '@/components/adsense/MarketingAds';
import JobsClient, { type PublicJob } from './JobsClient';

const BASE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : 'https://hookstep.in';

export const metadata: Metadata = {
    title: 'Open Jobs | HookStep',
    description: 'Browse open engineering, product and design roles from top companies hiring on HookStep.',
    alternates: { canonical: `${BASE_URL}/jobs` },
    openGraph: {
        title: 'Open Jobs | HookStep',
        description: 'Browse open engineering, product and design roles from top companies hiring on HookStep.',
        type: 'website',
        url: `${BASE_URL}/jobs`,
    },
};

export const revalidate = 60;

async function getJobs(): Promise<PublicJob[]> {
    try {
        const jobs = await prisma.job.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
                id: true,
                title: true,
                company: true,
                location: true,
                employmentType: true,
                category: true,
                skills: true,
                salary: true,
                currency: true,
                experienceMin: true,
                experienceMax: true,
                createdAt: true,
                companyId: true,
                organizationId: true,
            },
        });

        // Batch-fetch company slugs without crashing on orphaned refs
        const uniqueIds = Array.from(new Set(jobs.map(j => j.companyId)));
        const slugRows = uniqueIds.length
            ? await prisma.user.findMany({
                where: { id: { in: uniqueIds } },
                select: { id: true, companySlug: true },
            })
            : [];
        const slugMap = new Map(slugRows.map(u => [u.id, u.companySlug]));

        const orgIds = Array.from(
            new Set(jobs.map((j) => j.organizationId).filter((id): id is string => Boolean(id))),
        );
        const orgRows = orgIds.length
            ? await prisma.organization.findMany({
                  where: { id: { in: orgIds } },
                  select: { id: true, slug: true },
              })
            : [];
        const orgSlugMap = new Map(orgRows.map((o) => [o.id, o.slug]));

        return jobs.map(({ companyId, organizationId, createdAt, ...job }) => ({
            ...job,
            companySlug:
                organizationId && orgSlugMap.has(organizationId)
                    ? orgSlugMap.get(organizationId) ?? null
                    : slugMap.get(companyId) ?? null,
            createdAt: createdAt.toISOString(),
        }));
    } catch (err) {
        console.error('Failed to fetch active jobs:', err);
        return [];
    }
}

export default async function PublicJobsPage({
    searchParams,
}: {
    searchParams: { from?: string };
}) {
    const jobs = await getJobs();
    const fromCompany = searchParams.from ?? null;

    return (
        <div style={{ minHeight: '100vh', background: '#050a0e', position: 'relative' }}>
            <GlowBackground />
            <div style={{ position: 'relative', zIndex: 1 }}>
                <HeroNav />
                <JobsClient jobs={jobs} fromCompany={fromCompany} />
                <MarketingAds />
            </div>
        </div>
    );
}
