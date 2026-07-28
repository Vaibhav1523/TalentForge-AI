import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        /** Last OAuth provider used to sign in (e.g. linkedin) — set on login, not a live LinkedIn browser probe. */
        authProvider?: string;
        user: {
            id: string;
            role?: "candidate" | "recruiter";
            onboardingComplete?: boolean;
            companySlug?: string | null;
            /** Recruiter org name from profile (onboarding / settings), not the OAuth display name. */
            companyName?: string | null;
            /** Org logo or user-uploaded company logo (internal /api/images/... URL). */
            companyLogoUrl?: string | null;
            organizationId?: string | null;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        role?: "candidate" | "recruiter";
        onboardingComplete?: boolean;
        companySlug?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string;
        role?: "candidate" | "recruiter";
        onboardingComplete?: boolean;
        companySlug?: string | null;
        companyName?: string | null;
        companyLogoUrl?: string | null;
        organizationId?: string | null;
        authProvider?: string;
        /** Env SUPER_ADMIN_EMAIL match OR User.isSuperAdmin — used by middleware for /c/ access. */
        isPlatformSuperAdmin?: boolean;
        adminFlagsAt?: number;
    }
}
