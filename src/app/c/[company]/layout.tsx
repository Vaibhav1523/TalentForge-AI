import { headers } from 'next/headers';
import CompanySidebar from '@/components/dashboard/CompanySidebar';
import DashboardThemeProvider from '@/components/dashboard/DashboardThemeProvider';
import { RecruiterBasePathProvider } from '@/components/RecruiterBasePathContext';
import '@/app/dashboard/dashboard.css';
import { resolveCompanyAuth } from '@/lib/admin/resolve-company';
import { companyBrandingForDashboardSlug } from '@/lib/admin/viewed-company-from-slug';

export default async function CompanyLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { company: string };
}) {
    const { company } = params;

    const headersList = await headers();
    if (headersList.get("x-internal-public-route") === "1") {
        return <>{children}</>;
    }

    /** Same rules as /api/company/* and middleware fallback — avoids stale JWT vs URL slug mismatches. */
    const companyAuth = await resolveCompanyAuth(company);
    const isOwner = companyAuth.ok;

    const routeBranding = isOwner ? await companyBrandingForDashboardSlug(company) : { name: null, logoUrl: null };

    const base = `/c/${company}`;

    return (
        <div className="dashboard-container dashboard-reference-theme">
            <DashboardThemeProvider>
                <RecruiterBasePathProvider value={base}>
                    {isOwner && (
                        <CompanySidebar
                            routeCompanyName={routeBranding.name}
                            routeCompanyLogoUrl={routeBranding.logoUrl}
                        />
                    )}
                    <main className="main-content">
                        {children}
                    </main>
                </RecruiterBasePathProvider>
            </DashboardThemeProvider>
        </div>
    );
}
