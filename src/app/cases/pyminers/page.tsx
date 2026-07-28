import type { Metadata } from "next";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import { TreeLayer } from "@/components/TreeLayer";
import { CaseTreeMode } from "@/components/CaseTreeMode";
import { PyminersCaseContent } from "@/components/case/PyminersCaseContent";

export const metadata: Metadata = {
  title: "Senior Bitcoin Script Developer for Pyminers | HireU",
  description: "Detailed case study for Pyminers hiring outcome with HireU.",
};

export default function PyminersCasePage() {
  return (
    <>
      <CaseTreeMode />
      <AuroraCanvas />
      <TreeLayer />
      <main id="main-content" role="main">
        <section className="case-detail-page" aria-label="Pyminers full case">
          <PyminersCaseContent />
        </section>
      </main>
    </>
  );
}
