'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div role="alert" aria-live="assertive" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '40px',
            textAlign: 'center'
        }}>
            <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
            }}>
                <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>
                Something went wrong!
            </h2>
            <p style={{ color: '#6b7280', maxWidth: '400px', marginBottom: '32px', lineHeight: '1.6' }}>
                We encountered an error while loading this part of the dashboard. Please try refreshing or going back home.
            </p>

            <div style={{ display: 'flex', gap: '16px' }}>
                <button
                    type="button"
                    onClick={() => reset()}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <RefreshCcw size={18} />
                    Try Again
                </button>

                <Link href="/" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                    <Home size={18} />
                    Back Home
                </Link>
            </div>
        </div>
    );
}
