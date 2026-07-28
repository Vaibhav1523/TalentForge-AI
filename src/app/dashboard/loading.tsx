export default function DashboardLoading() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            width: '100%'
        }}>
            {/* Header Skeleton */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="skeleton" style={{ width: '200px', height: '32px', borderRadius: '8px' }}></div>
                    <div className="skeleton" style={{ width: '300px', height: '18px', borderRadius: '6px' }}></div>
                </div>
                <div className="skeleton" style={{ width: '150px', height: '44px', borderRadius: '12px' }}></div>
            </div>

            {/* Grid Skeleton */}
            <div className="stats-grid">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="card skeleton-card" style={{ height: '160px', padding: '24px' }}>
                        <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '12px', marginBottom: '20px' }}></div>
                        <div className="skeleton" style={{ width: '40%', height: '24px', borderRadius: '6px', marginBottom: '8px' }}></div>
                        <div className="skeleton" style={{ width: '80%', height: '16px', borderRadius: '4px' }}></div>
                    </div>
                ))}
            </div>

            {/* Content Skeleton */}
            <div className="dashboard-content-grid">
                <div className="card skeleton-card" style={{ height: '400px' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div className="card skeleton-card" style={{ height: '200px' }}></div>
                    <div className="card skeleton-card" style={{ height: '200px' }}></div>
                </div>
            </div>
        </div>
    );
}
