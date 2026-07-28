import type { Metadata } from "next";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import { TreeLayer } from "@/components/TreeLayer";
import { HeroNav } from "@/components/HeroNav";
import { CaseTreeMode } from "@/components/CaseTreeMode";
import { CasePageCards } from "@/components/case/CasePageCards";

export const metadata: Metadata = {
  title: "Case studies | HookStep",
  description:
    "How teams use HookStep to hire faster: case studies and examples from companies filling technical roles.",
};

export default function CasePage() {
  return (
    <>
      <CaseTreeMode />
      <AuroraCanvas />
      <TreeLayer />
      <main id="main-content" role="main">
        <HeroNav />

        <section className="case-page" aria-label="Case study page">
          <div className="case-page-wrap">
            <CasePageCards />
          </div>
        </section>
      </main>
    </>
  );
}
