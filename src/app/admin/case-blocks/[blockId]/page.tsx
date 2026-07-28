import { CaseBlockEditor } from "@/components/admin/CaseBlockEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: {
    blockId: string;
  };
};

export default function AdminCaseBlockPage({ params }: Props) {
  const blockId = decodeURIComponent(params.blockId);

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <CaseBlockEditor blockId={blockId} />
      </div>
    </main>
  );
}
