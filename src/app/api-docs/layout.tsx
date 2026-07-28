import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation",
  robots: { index: false, follow: false },
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
