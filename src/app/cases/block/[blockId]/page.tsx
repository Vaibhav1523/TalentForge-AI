import { CaseBlockFullStory } from "@/components/case/CaseBlockFullStory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: {
    blockId: string;
  };
};

export default function CaseBlockFullStoryPage({ params }: Props) {
  const blockId = decodeURIComponent(params.blockId);

  return (
    <main>
      <CaseBlockFullStory blockId={blockId} />
    </main>
  );
}
