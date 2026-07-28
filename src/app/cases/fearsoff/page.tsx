import type { Metadata } from "next";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import { TreeLayer } from "@/components/TreeLayer";
import { CaseTreeMode } from "@/components/CaseTreeMode";
import { FearsoffCaseContent } from "@/components/case/FearsoffCaseContent";

export const metadata: Metadata = {
  title: "Senior Smart Contract Auditor for FearsOff | HireU",
  description: "Detailed full story for FearsOff hiring outcome with HireU.",
};

export default function FearsoffCasePage() {
  return (
    <>
      <CaseTreeMode />
      <AuroraCanvas />
      <TreeLayer />
      <main id="main-content" role="main">
        <section className="case-detail-page" aria-label="FearsOff full story">
          <FearsoffCaseContent />
        </section>
      </main>
    </>
  );
}

