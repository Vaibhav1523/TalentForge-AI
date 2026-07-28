import type { Metadata } from "next";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeFavicon } from "@/components/ThemeFavicon";
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from 'sonner';
import "./globals.css";
import { SITE_THEME_COLOR } from "@/lib/site-brand";

const BASE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    : "https://hookstep.in";
/** Theme only — favicon href stays /favicon.png in HTML so Googlebot gets a stable 48×48 icon. */
const THEME_INIT_SCRIPT = `
(() => {
  try {
    const stored = localStorage.getItem('theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = stored === 'dark' || stored === 'light' ? stored : preferred;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  themeColor: SITE_THEME_COLOR,
  title: {
    default: "TalentForge AI | Tech Talent Platform",
    template: "%s | TalentForge AI",
  },
  description:
    "Connect top tech talent with world-class companies. AI/ML, Full Stack, Data Science, DevOps & QA - vetted professionals, hired fast.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "TalentForge AI",
    title: "TalentForge AI | Tech Talent Platform",
    description:
      "Connect top tech talent with world-class companies. AI/ML, Full Stack, Data Science, DevOps & QA - vetted professionals, hired fast.",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "TalentForge AI | Tech Talent Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TalentForge AI | Tech Talent Platform",
    description:
      "Connect top tech talent with world-class companies. AI/ML, Full Stack, Data Science, DevOps & QA - vetted professionals, hired fast.",
    site: "@talentforgeai",
    images: ["/opengraph-image"],
  },
  keywords: ["tech hiring", "software jobs", "remote jobs", "vetted talent", "TalentForge AI"],
  category: "technology",
  icons: {
    icon: [{ url: "/favicon.png", sizes: "48x48", type: "image/png" }],
    apple: "/brand/logo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <SessionProvider>
          <ThemeFavicon />
          <NextTopLoader color="#00ffe6" showSpinner={false} />
          <Toaster richColors position="top-right" />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
