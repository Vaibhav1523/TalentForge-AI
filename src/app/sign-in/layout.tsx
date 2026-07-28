import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to HookStep to access your talent dashboard or recruiter portal.",
  robots: { index: false, follow: false },
  alternates: { canonical: `https://${process.env.NEXT_PUBLIC_APP_DOMAIN ?? "hookstep.in"}/sign-in` },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
