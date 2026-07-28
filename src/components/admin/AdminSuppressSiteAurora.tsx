"use client";

import { useEffect } from "react";

const CLASS_NAME = "admin-suppress-site-aurora";

/**
 * Disables the marketing site's body::before / #gl teal layers while admin routes
 * are mounted (they sit on body and show through at scroll edges otherwise).
 */
export function AdminSuppressSiteAurora() {
    useEffect(() => {
        document.documentElement.classList.add(CLASS_NAME);
        return () => document.documentElement.classList.remove(CLASS_NAME);
    }, []);
    return null;
}
