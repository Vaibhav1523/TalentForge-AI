import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { MapPin, Briefcase, DollarSign, Clock, ArrowLeft } from 'lucide-react';
import { HeroNav } from '@/components/HeroNav';
import { AuroraCanvas } from '@/components/AuroraCanvas';
import { ApplyButton } from '@/components/ApplyButton';
import { isHtmlString, sanitizeHtml } from '@/lib/htmlUtils';
import RecruiterJobView from './RecruiterJobView';
import { isSuperAdminByEmail } from '@/lib/admin/super-admin-core';

type Props = { params: { company: string; id: string } };

async function getJob(id: string) {
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
            },
        });
    } catch (err) {
        console.error("Failed to load job in page component", err);
        return null;
    }
}

export default async function JobPage({ params }: Props) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase();
    const isSuperAdmin = await isSuperAdminByEmail(email);
    const isRecruiter =
        session?.user?.role === 'recruiter' &&
        session?.user?.companySlug === params.company;

    if (isRecruiter || isSuperAdmin) {
        return <RecruiterJobView params={params} />;
    }

    // Everyone else → public job detail
    const job = await getJob(params.id);
    if (!job || job.status !== 'ACTIVE') notFound();

    const exp = job.experienceMin != null
        ? `${job.experienceMin}–${job.experienceMax ?? job.experienceMin} years`
        : null;
    const descIsHtml = isHtmlString(job.description);
    const sanitizedDesc = sanitizeHtml(job.description);
    const descParagraphs = !descIsHtml ? (job.description ?? '').split(/\n{2,}/).filter(Boolean) : [];
    const applyHref = `/dashboard/${params.company}/jobs/${job.id}/apply`;

    const chip = (icon: React.ReactNode, text: string) => (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px', padding: '5px 13px', fontSize: '13px', fontWeight: 500,
        }}>
            {icon}{text}
        </span>
    );

    return (
        <div style={{ minHeight: '100vh', position: 'relative', zIndex: 10 }}>
            <AuroraCanvas />
            <HeroNav />

            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '120px 16px 80px' }}>
                {/* Back link */}
                <Link href={`/jobs?from=${params.company}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    color: 'rgba(255,255,255,0.45)', fontSize: '14px', textDecoration: 'none',
                    marginBottom: '28px', transition: 'color 0.2s',
                }}>
                    <ArrowLeft size={15} /> All jobs
                </Link>

                {/* Main job card */}
                <div style={{
                    background: 'rgba(0,0,0,0.55)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    padding: 'clamp(24px, 4vw, 40px)',
                    marginBottom: '20px',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 0 60px rgba(0,200,180,0.08)',
                }}>
                    {/* Title */}
                    <h1 style={{
                        fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800,
                        color: '#fff', margin: '0 0 6px', lineHeight: 1.2,
                        letterSpacing: '-0.5px',
                    }}>
                        {job.title}
                    </h1>
                    <p style={{
                        fontSize: '17px', color: '#0d9488', fontWeight: 600,
                        margin: '0 0 24px', letterSpacing: '0.1px',
                    }}>
                        {job.company}
                    </p>

                    {/* Meta chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                        {chip(<MapPin size={13} />, job.location ?? '—')}
                        {chip(<Briefcase size={13} />, job.employmentType ? job.employmentType.replace(/_/g, ' ') : '—')}
                        {job.salary && chip(<DollarSign size={13} />, `${job.currency ?? 'USD'} ${job.salary}`)}
                        {exp && chip(<Clock size={13} />, exp)}
                        {chip(null, job.category ?? '—')}
                    </div>

                    {/* Skills */}
                    {Array.isArray(job.skills) && job.skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
                            {job.skills.map(skill => (
                                <span key={skill} style={{
                                    background: 'rgba(13,148,136,0.15)',
                                    color: '#2dd4bf',
                                    border: '1px solid rgba(13,148,136,0.35)',
                                    borderRadius: '6px', padding: '4px 12px',
                                    fontSize: '13px', fontWeight: 600,
                                }}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    )}

                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0 0 28px' }} />

                    {/* Description */}
                    {descIsHtml ? (
                        <div
                            className="rich-preview dark"
                            style={{ fontSize: '15px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.8 }}
                            dangerouslySetInnerHTML={{ __html: sanitizedDesc }}
                        />
                    ) : (
                        <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.8 }}>
                            {descParagraphs.map((para, i) => (
                                <p key={i} style={{ margin: '0 0 16px', whiteSpace: 'pre-line' }}>{para}</p>
                            ))}
                        </div>
                    )}
                </div>

                {/* CTA card */}
                <div style={{
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(13,148,136,0.3)',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '16px',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 0 40px rgba(0,200,180,0.06)',
                }}>
                    <div>
                        <p style={{ fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 4px' }}>
                            Interested in this role?
                        </p>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                            Sign in with your account to apply in under 2 minutes.
                        </p>
                    </div>
                    <ApplyButton applyHref={applyHref} />
                </div>
            </main>
        </div>
    );
}
