import type { Metadata } from "next";
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardThemeProvider from '@/components/dashboard/DashboardThemeProvider';
import './dashboard.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) redirect('/');

    // Recruiters now live under /c/:companySlug/* — redirect them away from /dashboard
    if (session?.user?.role === 'recruiter') {
        const rawSlug = (session.user as { companySlug?: string | null })?.companySlug;
        const normalizedSlug = rawSlug ? rawSlug.replace(/^\/+/, '') : null;
        const safeSlug = normalizedSlug && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(normalizedSlug) ? normalizedSlug : null;
        redirect(safeSlug ? `/c/${safeSlug}` : '/onboarding');
    }

    return (
        <div className="dashboard-container dashboard-reference-theme">
            <DashboardThemeProvider>
                <Sidebar />
                <main className="main-content">
                    {children}
                </main>
            </DashboardThemeProvider>
        </div>
    );
}
