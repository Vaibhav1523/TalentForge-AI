import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function CandidateDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/');

    if (session?.user?.role === 'recruiter') {
        const slug = (session.user as { companySlug?: string | null })?.companySlug;
        redirect(slug ? `/c/${slug}` : '/onboarding');
    }

    return <>{children}</>;
}
