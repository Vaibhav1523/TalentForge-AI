import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { MarketingArticleShell } from "@/components/MarketingArticleShell";
import m from "../marketingArticle.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "https://hookstep.in";

const FALLBACK_FOUNDERS = [
  {
    name: "Saraswati",
    role: "CEO",
    photo: "/team/saraswati.png",
    bio: "Saraswati leads HookStep’s vision and company direction—connecting global talent with serious technical and AI-related opportunities.",
  },
  {
    name: "Mohan",
    role: "COO",
    photo: "/team/mohan.png",
    bio: "Mohan runs operations end-to-end: partnerships, delivery systems, and the processes that keep hiring quality high as HookStep scales.",
  },
  {
    name: "Sakshi",
    role: "Head of Sales",
    photo: "/team/sakshi.png",
    bio: "Sakshi builds relationships with employers and helps companies hire exceptional tech talent quickly through HookStep.",
  },
] as const;

export const metadata: Metadata = {
  title: "HookStep founders & leadership | hookstep.in",
  description:
    "Meet the HookStep (hookstep.in) founding team and leadership building the hiring platform for tech and AI talent.",
  alternates: { canonical: `${BASE_URL}/founders` },
  keywords: [
    "HookStep founders",
    "hookstep.in founders",
    "HookStep leadership",
    "HookStep CEO",
    "HookStep team",
  ],
  openGraph: {
    title: "HookStep founders & leadership",
    description:
      "Founding team and leadership behind hookstep.in—the hiring platform for vetted tech and specialist roles.",
    url: `${BASE_URL}/founders`,
    type: "website",
  },
};

export default async function FoundersPage() {
  let founders: { name: string; role: string; photo: string; bio: string }[] = [...FALLBACK_FOUNDERS];

  try {
    const dbTeam = await prisma.teamMember.findMany({ orderBy: { sortOrder: "asc" } });
    if (dbTeam.length > 0) {
      founders = dbTeam.map((m) => ({
        name: m.name,
        role: m.role,
        photo: m.avatarUrl || `/team/${m.name.toLowerCase()}.png`,
        bio: m.bio || `${m.name} is ${m.role} at HookStep.`,
      }));
    }
  } catch (err) {
    console.error("[FoundersPage] Failed to load team:", err);
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HookStep",
    url: BASE_URL,
    description:
      "Hiring platform at hookstep.in connecting employers with vetted technical talent.",
    founder: founders.map((f) => ({
      "@type": "Person",
      name: f.name,
      jobTitle: f.role,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MarketingArticleShell>
        <div className={m.root}>
          <header className={m.hero}>
            <h1 className={m.title}>HookStep founders &amp; leadership</h1>
            <p className={m.lead}>
              <strong>hookstep.in</strong> is built by a focused leadership team obsessed with hiring
              quality, speed, and a better experience for companies and candidates. Photos and cards also
              appear on the <Link href="/#team">homepage founders section</Link>.
            </p>
          </header>

          <section className={m.section} aria-labelledby="founder-spotlight">
            <h2 id="founder-spotlight" className={m.sectionLabel}>
              Leadership
            </h2>
            <div className={m.card}>
              <ul className={m.list} style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "1.25rem" }}>
                {founders.map((person) => (
                  <li
                    key={person.name}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "88px 1fr",
                      gap: "1rem",
                      alignItems: "start",
                    }}
                  >
                    <Image
                      src={person.photo}
                      alt={person.name}
                      width={88}
                      height={88}
                      unoptimized={person.photo.startsWith("/api/") || person.photo.startsWith("http")}
                      style={{
                        borderRadius: "999px",
                        objectFit: "cover",
                        objectPosition: "center top",
                        border: "2px solid rgba(120, 220, 210, 0.45)",
                      }}
                    />
                    <div>
                      <p className={m.body} style={{ marginTop: 0, marginBottom: "0.35rem" }}>
                        <strong>{person.name}</strong> — {person.role}
                      </p>
                      <p className={m.body} style={{ margin: 0 }}>
                        {person.bio}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className={m.section} aria-labelledby="founders-more">
            <h2 id="founders-more" className={m.sectionLabel}>
              Learn more
            </h2>
            <div className={m.card}>
              <p className={m.body}>
                Read <Link href="/about">About HookStep</Link>, <Link href="/how-it-works">how it works</Link>
                , or the <Link href="/faq">FAQ</Link>. For partnerships or press, use{" "}
                <Link href="/recruiter">contact</Link> with a short note so we can route your message.
              </p>
            </div>
          </section>

          <div className={m.ctaBand}>
            <p>
              Return to <Link href="/">hookstep.in home</Link> or <Link href="/jobs">browse open jobs</Link>.
            </p>
          </div>
        </div>
      </MarketingArticleShell>
    </>
  );
}
