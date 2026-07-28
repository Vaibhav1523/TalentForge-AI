'use client';

import { Moon, Sun, Sparkles } from 'lucide-react';
import { useDashboardTheme } from '@/components/dashboard/DashboardThemeProvider';

export default function ThemeToggle() {
    const { theme, toggleTheme, isAnimating } = useDashboardTheme();
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            className={`theme-toggle-btn ${isDark ? 'is-dark' : 'is-light'}`}
            onClick={toggleTheme}
            disabled={isAnimating}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            aria-live="polite"
        >
            <span className="theme-toggle-icon-wrap">
                <span className="theme-toggle-glow" />
                {isDark
                    ? <Moon size={15} strokeWidth={2} className="theme-toggle-icon" />
                    : <Sun size={15} strokeWidth={2} className="theme-toggle-icon" />
                }
            </span>
            <span className="theme-toggle-label">{isDark ? 'Dark' : 'Light'}</span>
            <Sparkles size={10} className="theme-toggle-sparkle" />
        </button>
    );
}
