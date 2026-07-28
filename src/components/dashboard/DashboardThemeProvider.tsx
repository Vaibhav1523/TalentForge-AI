'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

type Theme = 'dark' | 'light';

type DashboardThemeContextValue = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    isAnimating: boolean;
};

const THEME_STORAGE_KEY = 'theme';
const ANIMATION_HALF_MS = 320;
const ANIMATION_TOTAL_MS = ANIMATION_HALF_MS * 2;

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(null);

function getSystemTheme(): Theme {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function sanitizeTheme(value: string | null | undefined): Theme | null {
    if (value === 'dark' || value === 'light') return value;
    return null;
}

function applyThemeToDocument(theme: Theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
}

export function useDashboardTheme() {
    const ctx = useContext(DashboardThemeContext);
    if (!ctx) {
        throw new Error('useDashboardTheme must be used within DashboardThemeProvider');
    }
    return ctx;
}

export default function DashboardThemeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [isAnimating, setIsAnimating] = useState(false);
    const [overlayPhase, setOverlayPhase] = useState<'idle' | 'enter' | 'exit'>('idle');
    const [overlayColor, setOverlayColor] = useState('#050f17');
    const timersRef = useRef<number[]>([]);

    useEffect(() => {
        const rootTheme = sanitizeTheme(document.documentElement.getAttribute('data-theme'));
        let storedTheme: Theme | null = null;
        try {
            storedTheme = sanitizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
        } catch {
            // localStorage may be unavailable in restricted contexts
        }
        const initialTheme = rootTheme ?? storedTheme ?? getSystemTheme();

        setThemeState(initialTheme);
        applyThemeToDocument(initialTheme);
    }, []);

    useEffect(() => {
        return () => {
            timersRef.current.forEach((id) => {
                window.clearTimeout(id);
            });
            timersRef.current = [];
        };
    }, []);

    const clearTimers = useCallback(() => {
        timersRef.current.forEach((id) => {
            window.clearTimeout(id);
        });
        timersRef.current = [];
    }, []);

    const setTheme = useCallback((nextTheme: Theme) => {
        setThemeState(nextTheme);
        applyThemeToDocument(nextTheme);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
            // Persistence may fail in restricted contexts
        }
    }, []);

    const runTransition = useCallback((nextTheme: Theme) => {
        if (isAnimating || nextTheme === theme) return;

        clearTimers();
        setIsAnimating(true);
        setOverlayColor(nextTheme === 'light' ? '#f8fafc' : '#050f17');
        setOverlayPhase('enter');

        const themeSwitchTimer = window.setTimeout(() => {
            setTheme(nextTheme);
            setOverlayPhase('exit');
        }, ANIMATION_HALF_MS);

        const finishTimer = window.setTimeout(() => {
            setOverlayPhase('idle');
            setIsAnimating(false);
        }, ANIMATION_TOTAL_MS);

        timersRef.current = [themeSwitchTimer, finishTimer];
    }, [clearTimers, isAnimating, setTheme, theme]);

    const toggleTheme = useCallback(() => {
        const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
        runTransition(nextTheme);
    }, [runTransition, theme]);

    const contextValue = useMemo<DashboardThemeContextValue>(() => ({
        theme,
        setTheme: (nextTheme) => runTransition(nextTheme),
        toggleTheme,
        isAnimating,
    }), [isAnimating, runTransition, theme, toggleTheme]);

    return (
        <DashboardThemeContext.Provider value={contextValue}>
            {children}
            <div
                className={`theme-flow-overlay theme-flow-${overlayPhase}`}
                style={{ '--theme-flow-color': overlayColor } as CSSProperties}
                aria-hidden="true"
            />
        </DashboardThemeContext.Provider>
    );
}
