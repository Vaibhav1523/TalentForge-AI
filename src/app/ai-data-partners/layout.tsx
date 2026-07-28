import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import typo from "./typography-scope.module.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-ai-partners-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-ai-partners-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const BASE = process.env.NEXT_PUBLIC_APP_DOMAIN
  ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
  : "https://hookstep.in";

export const metadata: Metadata = {
  title: "AI data partners — vetted workforce for eval & labeling | HookStep",
  description:
    "Vetted contributor cohorts for model evaluation, preference data, and annotation. Partner or pilot with HookStep.",
  alternates: { canonical: `${BASE}/ai-data-partners` },
  openGraph: {
    title: "HookStep for AI data teams",
    description: "Workforce partners for labeling, eval, and human-in-the-loop programs.",
    url: `${BASE}/ai-data-partners`,
  },
};

export default function AiDataPartnersLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${sourceSans.variable} ${sourceSerif.variable} ${typo.wrap}`}>
      {children}
    </div>
  );
}
