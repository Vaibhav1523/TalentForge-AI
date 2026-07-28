"use client";

import { SessionProvider as Provider, useSession } from "next-auth/react";
import React, { useEffect } from "react";
import { clearLinkedinAccountHint } from "@/lib/sign-out-hookstep";

/** After any successful sign-in (Google, GitHub, LinkedIn), drop the LinkedIn-only logout hint so it never lingers. */
function ClearLinkedinHintWhenAuthed() {
    const { status } = useSession();
    useEffect(() => {
        if (status === "authenticated") {
            clearLinkedinAccountHint();
        }
    }, [status]);
    return null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
    return (
        <Provider>
            <ClearLinkedinHintWhenAuthed />
            {children}
        </Provider>
    );
}
