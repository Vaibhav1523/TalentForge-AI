"use client";

import { AuroraCanvas } from "@/components/AuroraCanvas";

interface AuthWrapperProps {
    children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#05070c',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }}>
            {/* Background Aurora */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <AuroraCanvas />
            </div>

            {/* Centered Content Area */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {children}
            </div>

            {/* Static Smoke/Gradient Background Layer */}
            <div style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                background: 'linear-gradient(to top right, #05070c, transparent, transparent)',
                opacity: 0.4
            }} />
        </div>
    );
}
