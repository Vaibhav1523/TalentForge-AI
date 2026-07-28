import { CaseBlocksManager } from "@/components/admin/CaseBlocksManager";

export default function AdminCasesPage() {
    return (
        <div className="page-shell">
            <div className="page-wrap">
                <section className="header-card">
                    <h1 className="header-title">Case Studies</h1>
                    <p className="header-subtitle">Manage case blocks displayed on the /cases page</p>
                </section>

                <CaseBlocksManager />
            </div>
        </div>
    );
}
