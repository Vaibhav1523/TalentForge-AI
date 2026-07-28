import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/');

    if (session.user?.role === 'recruiter') {
        const rawSlug = (session.user as { companySlug?: string | null })?.companySlug;
        const safeSlug = rawSlug && /^[a-z0-9-]+$/i.test(rawSlug) ? rawSlug.replace(/^\/+/, '') : null;
        redirect(safeSlug ? `/c/${safeSlug}` : '/onboarding');
    }

    redirect('/dashboard/jobs');
}
