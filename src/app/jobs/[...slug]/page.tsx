import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cache } from 'react';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { MapPin, Briefcase, DollarSign, Clock, ArrowLeft } from 'lucide-react';
import { HeroNav } from '@/components/HeroNav';
import { GlowBackground } from '@/components/GlowBackground';
import { ApplyButton } from '@/components/ApplyButton';
import { isHtmlString, sanitizeHtml } from '@/lib/htmlUtils';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'hookstep.in';

// slug can be:
//   [id]               → /jobs/69a4497d...       (legacy — redirect to canonical)
//   [company, id]      → /jobs/tech-tank/69a4...  (canonical)
type Props = { params: { slug: string[] } };

function parseSlug(slug: string[]): { jobId: string; companySegment: string | null } {
    if (slug.length === 1) return { jobId: slug[0], companySegment: null };
    if (slug.length === 2) return { jobId: slug[1], companySegment: slug[0] };
    return { jobId: slug[slug.length - 1], companySegment: slug[slug.length - 2] };
}

const getJob = cache(async (id: string) => {
    try {
        return await prisma.job.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                company: true,
                location: true,
                description: true,
                employmentType: true,
                category: true,
                skills: true,
                salary: true,
                currency: true,
                experienceMin: true,
                experienceMax: true,
                status: true,
                createdAt: true,
                companyUser: { select: { companySlug: true } },
                organization: { select: { slug: true } },
            },
        });
    } catch (error) {
        console.error("Error fetching job:", error);
        return null;
    }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { jobId } = parseSlug(params.slug);
    const job = await getJob(jobId);
    if (!job || job.status !== 'ACTIVE') {
        return {
            title: 'Job Not Found | HookStep',
            robots: { index: false, follow: true },
        };
    }

    const exp = job.experienceMin != null
        ? `${job.experienceMin}–${job.experienceMax ?? job.experienceMin} years exp · `
        : '';
    const loc = job.location ?? 'Remote';
    const emp = typeof job.employmentType === 'string' ? job.employmentType.replace(/_/g, ' ') : 'Full-time';
    const shortDesc = `${job.title} at ${job.company}. ${exp}${loc} · ${emp}. Apply in under 2 minutes on HookStep.`;
    const description = shortDesc.length > 160 ? shortDesc.slice(0, 157) + '...' : shortDesc;
    const companySlug = job.organization?.slug ?? job.companyUser?.companySlug;
    const canonicalUrl = companySlug
        ? `https://${APP_DOMAIN}/jobs/${companySlug}/${job.id}`
        : `https://${APP_DOMAIN}/jobs/${job.id}`;

    return {
        title: `${job.title} at ${job.company} | HookStep`,
        description,
        keywords: [
            job.title,
            job.company,
            ...(job.skills?.slice(0, 5) ?? []),
            job.category ?? 'jobs',
            'hire',
            'apply',
        ].filter(Boolean),
        alternates: { canonical: canonicalUrl },
        openGraph: {
            title: `${job.title} at ${job.company}`,
            description,
            url: canonicalUrl,
            type: 'website',
            siteName: 'HookStep',
            locale: 'en_US',
            // Job-level opengraph-image.tsx cannot live under [...slug] (Next: catch-all must be last).
            images: [{ url: `https://${APP_DOMAIN}/opengraph-image`, width: 1200, height: 630, alt: `${job.title} at ${job.company}` }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${job.title} at ${job.company}`,
            description,
        },
    };
}

export const revalidate = 60;

export default async function PublicJobDetailPage({ params }: Props) {
    const { jobId, companySegment } = parseSlug(params.slug);
    const job = await getJob(jobId);

    if (!job || job.status !== 'ACTIVE') notFound();

    const applyCompanySlug =
        companySegment ?? job.organization?.slug ?? job.companyUser?.companySlug ?? null;
    const applyHref = applyCompanySlug
        ? `/dashboard/${applyCompanySlug}/jobs/${job.id}/apply`
        : `/dashboard/jobs/${job.id}/apply`;

    const exp = job.experienceMin != null
        ? `${job.experienceMin}–${job.experienceMax ?? job.experienceMin} years`
        : null;

    const descIsHtml = isHtmlString(job.description);
    const sanitizedDesc = sanitizeHtml(job.description);
    const descParagraphs = !descIsHtml ? (job.description ?? '').split(/\n{2,}/).filter(Boolean) : [];

    const postedDate = job.createdAt
        ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    const toTitleCase = (s: string) =>
        s.replace(/_/g, ' ').replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    const sidebarItems = [
        ...(job.salary ? [{ label: 'Compensation', value: `${job.currency ?? 'USD'} ${job.salary}`, accent: true }] : []),
        ...(exp ? [{ label: 'Experience', value: exp }] : []),
        { label: 'Employment', value: job.employmentType ? toTitleCase(job.employmentType) : '—' },
        { label: 'Location', value: job.location ? toTitleCase(job.location) : '—' },
        ...(job.category ? [{ label: 'Category', value: job.category }] : []),
        ...(postedDate ? [{ label: 'Posted', value: postedDate }] : []),
    ];

    return (
        <div className="job-detail-page" style={{ minHeight: '100vh', background: '#050a0e', position: 'relative' }}>
            <GlowBackground />
            <div style={{ position: 'relative', zIndex: 1 }}>
            <HeroNav />

            <main className="job-detail-main" style={{ maxWidth: '1060px', margin: '0 auto', padding: '110px 20px 100px' }}>
                <Link
                    className="job-detail-back"
                    href={companySegment ? `/jobs?from=${companySegment}` : '/jobs'}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        color: 'rgba(255,255,255,0.35)', fontSize: '13px', textDecoration: 'none',
                        marginBottom: '28px', fontWeight: 500,
                    }}
                >
                    <ArrowLeft size={14} /> All jobs
                </Link>

                {/* Hero header */}
                <div className="job-detail-hero" style={{
                    background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(56,100,220,0.06) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '24px',
                    padding: 'clamp(28px, 4vw, 44px)',
                    marginBottom: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Subtle top gradient line */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                        background: 'linear-gradient(90deg, transparent, #0d9488, #3864dc, transparent)',
                        opacity: 0.6,
                    }} />

                    {/* Company badge + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, rgba(13,148,136,0.3), rgba(13,148,136,0.1))',
                            border: '1px solid rgba(13,148,136,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', fontWeight: 800, color: '#2dd4bf',
                            letterSpacing: '-0.5px', flexShrink: 0,
                        }}>
                            {(job.company || '?')[0].toUpperCase()}
                        </div>
                        <div>
                            <p style={{ fontSize: '15px', color: '#2dd4bf', fontWeight: 600, margin: 0 }}>
                                {job.company}
                            </p>
                            {postedDate && (
                                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                                    Posted {postedDate}
                                </p>
                            )}
                        </div>
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(26px, 4.5vw, 38px)', fontWeight: 800,
                        color: '#fff', margin: '0 0 20px', lineHeight: 1.15,
                        letterSpacing: '-0.6px',
                    }}>
                        {job.title}
                    </h1>

                    {/* Meta chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {[
                            { icon: <MapPin size={13} />, text: job.location ? toTitleCase(job.location) : '—' },
                            { icon: <Briefcase size={13} />, text: job.employmentType ? toTitleCase(job.employmentType) : '—' },
                            ...(job.salary ? [{ icon: <DollarSign size={13} />, text: `${job.currency ?? 'USD'} ${job.salary}` }] : []),
                            ...(exp ? [{ icon: <Clock size={13} />, text: exp }] : []),
                        ].map((c, i) => (
                            <span key={i} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: 500,
                            }}>
                                {c.icon}{c.text}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Two-column layout */}
                <div className="job-detail-content" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                    {/* Left: Description */}
                    <div className="job-detail-desc" style={{ flex: '1 1 580px', minWidth: 0 }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '20px',
                            padding: 'clamp(24px, 3.5vw, 40px)',
                        }}>
                            <h2 style={{
                                fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)',
                                margin: '0 0 20px',
                            }}>
                                Job Description
                            </h2>

                            {descIsHtml ? (
                                <div
                                    className="rich-preview dark"
                                    style={{ fontSize: '15px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.85 }}
                                    dangerouslySetInnerHTML={{ __html: sanitizedDesc }}
                                />
                            ) : (
                                <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.85 }}>
                                    {descParagraphs.map((para, i) => (
                                        <p key={i} style={{ margin: '0 0 16px', whiteSpace: 'pre-line' }}>{para}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="job-detail-sidebar" style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Quick details card */}
                        <div
                            className="job-detail-overview-card"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '20px',
                                padding: '24px',
                            }}
                        >
                            <h3 className="job-detail-card-title" style={{
                                fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)',
                                margin: '0 0 18px',
                            }}>
                                Overview
                            </h3>
                            <div className="job-detail-overview-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {sidebarItems.map((item, i) => (
                                    <div key={i} className="job-detail-overview-item">
                                        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>
                                            {item.label}
                                        </p>
                                        <p style={{
                                            fontSize: '14px', fontWeight: 600, margin: 0,
                                            color: item.accent ? '#2dd4bf' : 'rgba(255,255,255,0.8)',
                                        }}>
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Skills card */}
                        {Array.isArray(job.skills) && job.skills.length > 0 && (
                            <div
                                className="job-detail-skills-card"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: '20px',
                                    padding: '24px',
                                }}
                            >
                                <h3 className="job-detail-card-title" style={{
                                    fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                                    letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)',
                                    margin: '0 0 14px',
                                }}>
                                    Skills
                                </h3>
                                <div className="job-detail-skills-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {job.skills.map(skill => (
                                        <span
                                            key={skill}
                                            className="job-detail-skill-tag"
                                            style={{
                                                background: 'rgba(13,148,136,0.1)', color: '#2dd4bf',
                                                border: '1px solid rgba(13,148,136,0.25)',
                                                borderRadius: '8px', padding: '5px 12px',
                                                fontSize: '12px', fontWeight: 600,
                                            }}
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CTA card */}
                        <div
                            className="job-detail-cta-card"
                            style={{
                                background: 'linear-gradient(135deg, rgba(13,148,136,0.12) 0%, rgba(13,148,136,0.04) 100%)',
                                border: '1px solid rgba(13,148,136,0.2)',
                                borderRadius: '20px',
                                padding: '24px',
                                textAlign: 'center',
                            }}
                        >
                            <p style={{ fontWeight: 700, fontSize: '15px', color: '#fff', margin: '0 0 6px' }}>
                                Interested?
                            </p>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 16px', lineHeight: 1.4 }}>
                                Apply in under 2 minutes
                            </p>
                            <ApplyButton applyHref={applyHref} ariaLabel={`Apply for ${job.title} at ${job.company}`} />
                        </div>
                    </div>
                </div>
            </main>
            </div>
        </div>
    );
}
