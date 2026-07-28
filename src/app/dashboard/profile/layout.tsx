import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function CandidateProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/');

    if (session.user?.role === 'recruiter') {
        const rawSlug = (session.user as { companySlug?: string | null })?.companySlug;
        const normalizedSlug = rawSlug ? rawSlug.replace(/^\/+/, '') : null;
        const safeSlug = normalizedSlug && /^[a-z0-9-]+$/i.test(normalizedSlug) ? normalizedSlug : null;
        redirect(safeSlug ? `/c/${safeSlug}` : '/onboarding');
    }

    return <>{children}</>;
}
