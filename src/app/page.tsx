import type { Metadata } from "next";
import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { HomeClient } from "@/components/HomeClient";
import { MarketingAds } from "@/components/adsense/MarketingAds";

const BASE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "https://hookstep.in";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "HookStep | Hire Top Tech Talent Fast",
  description:
    "Connect with vetted AI/ML, Full Stack, Data Science, DevOps & QA professionals. Remote-ready tech experts, hired in days - not months.",
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: "website",
    url: BASE_URL,
    title: "HookStep | Hire Top Tech Talent Fast",
    description:
      "Connect with vetted AI/ML, Full Stack, Data Science, DevOps & QA professionals. Remote-ready tech experts, hired in days - not months.",
  },
  twitter: {
    card: "summary_large_image",
    title: "HookStep | Hire Top Tech Talent Fast",
    description:
      "Connect with vetted AI/ML, Full Stack, Data Science, DevOps & QA professionals. Remote-ready tech experts, hired in days - not months.",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HookStep",
  url: BASE_URL,
  description:
    "Tech talent platform connecting companies with vetted AI/ML, Full Stack, Data Science, DevOps & QA professionals.",
  founder: {
    "@type": "Person",
    name: "Saraswati",
    jobTitle: "CEO",
  },
  sameAs: [],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "HookStep",
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/jobs?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default async function Home() {
  let teamMembers: {
    name: string;
    role: string;
    bio: string;
    avatarUrl: string | null;
    iconName: string;
    tilt: string;
    featured: boolean;
  }[] = [];

  try {
    const dbTeam = await prisma.teamMember.findMany({ orderBy: { sortOrder: "asc" } });
    teamMembers = dbTeam.map((m) => ({
      name: m.name,
      role: m.role,
      bio: m.bio,
      avatarUrl: m.avatarUrl,
      iconName: m.iconName,
      tilt: m.tilt,
      featured: m.featured,
    }));
  } catch (err) {
    console.error("[Home] Failed to fetch team members:", err);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      {/** Auto ads + script; display unit is rendered inside HomeClient above the footer */}
      <MarketingAds showUnit={false} />
      <Suspense fallback={null}>
        <HomeClient teamMembers={teamMembers.length > 0 ? teamMembers : undefined} />
      </Suspense>
    </>
  );
}
