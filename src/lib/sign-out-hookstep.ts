"use client";

import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

const LI_HINT_KEY = "hookstep_li_account_hint";

/** True after sign-out if the session used LinkedIn — best proxy for “LinkedIn may still know this browser”. */
export function readLinkedinAccountHint(): boolean {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(LI_HINT_KEY) === "1";
}

export function clearLinkedinAccountHint() {
    if (typeof window !== "undefined") sessionStorage.removeItem(LI_HINT_KEY);
}

/**
 * Sign out. Only if the current HookStep session used LinkedIn (`authProvider === "linkedin"`), set a one-time hint
 * for the next sign-in screen. Google/GitHub logouts do not set the hint. The hint is cleared when they sign in with any provider.
 */
export async function signOutFromHookstep(session: Session | null, callbackUrl: string) {
    let url = callbackUrl;
    if (session?.authProvider === "linkedin" && typeof window !== "undefined") {
        sessionStorage.setItem(LI_HINT_KEY, "1");
        const sep = callbackUrl.includes("?") ? "&" : "?";
        url = `${callbackUrl}${sep}li=1`;
    }
    await signOut({ callbackUrl: url });
}
