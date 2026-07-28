export const CASE_BLOCKS_STORAGE_KEY = "hireu.caseBlocks.v1";

export type CaseBlockFullStory = {
  headline: string;
  brand: string;
  summaryTitle: string;
  summaryBody: string;
  detailsTitle: string;
  detailsBody: string;
  matterTitle: string;
  matterBody: string;
  impactTitle: string;
  impactBody: string;
  mediaUrl: string;
  mediaAlt: string;
};

export type CaseBlock = {
  id: string;
  title: string;
  role: string;
  summary: string;
  details: string;
  highlight: string;
  fullStoryMatter: string;
  imageUrl: string;
  imageAlt: string;
  primaryLabel: string;
  primaryHref: string;
  fullStory: CaseBlockFullStory;
  reverse: boolean;
};

export const DEFAULT_CASE_BLOCKS: CaseBlock[] = [
  {
    id: "pyminers",
    title: "Luis A Ploennig",
    role: "CEO at Pyminers",
    summary:
      "Pyminers sought a highly skilled full-stack senior developer with deep Bitcoin Script and related technologies.",
    details:
      "HireU executed a targeted search and identified a high-fit candidate who passed every screening round and completed the technical assignment.",
    highlight: "Position was filled in 19 days.",
    fullStoryMatter:
      "Pyminers needed deep Bitcoin Script expertise under tight deadlines. HireU built a focused sourcing and validation funnel, aligned technical checks with client expectations, and closed with a high-fit hire in 19 days.",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=90",
    imageAlt: "Team discussion in a professional meeting",
    primaryLabel: "Full Story",
    primaryHref: "/cases/block/pyminers",
    fullStory: {
      headline: "Senior Bitcoin Script Developer for Pyminers",
      brand: "Pyminers",
      summaryTitle: "Client Requirements",
      summaryBody:
        "Pyminers needed a senior Bitcoin Script developer with strong open-source contributions and production-level blockchain engineering experience.",
      detailsTitle: "Solution & Process",
      detailsBody:
        "HireU executed a targeted search and identified an exceptional candidate through deep technical screening and assignment-based validation.",
      matterTitle: "Full Story Matter",
      matterBody:
        "Pyminers needed deep Bitcoin Script expertise under tight deadlines. HireU built a focused sourcing and validation funnel, aligned technical checks with client expectations, and closed with a high-fit hire in 19 days.",
      impactTitle: "Results & Impact",
      impactBody:
        "Position filled in 19 calendar days with strong post-onboarding satisfaction and smooth integration into the remote engineering workflow.",
      mediaUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=90",
      mediaAlt: "Team during candidate interview discussion",
    },
    reverse: false,
  },
  {
    id: "fearsoff",
    title: "Marwan Hachem",
    role: "Co-Founder at FearsOff",
    summary:
      "FearsOff needed a senior smart-contract auditor with strong Web3 and cybersecurity experience, including low-level systems knowledge.",
    details:
      "HireU built a custom hiring strategy, sourced deeply vetted profiles, and completed the process with a shortlist that matched both technical and product needs.",
    highlight: "Role closed in 21 days with 1 final-round hire.",
    fullStoryMatter:
      "FearsOff required a senior smart-contract auditor with strong Web3 security depth. HireU designed an assessment-first pipeline and delivered a successful final-round placement in 21 days.",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=92",
    imageAlt: "Founder smiling in a video call",
    primaryLabel: "Full Case",
    primaryHref: "/cases/block/fearsoff",
    fullStory: {
      headline: "Senior Smart Contract Auditor for FearsOff",
      brand: "FearsOff",
      summaryTitle: "Client Requirements",
      summaryBody:
        "FearsOff required a senior auditor who could review complex smart-contract systems for both Web3 protocol logic and Web2 security risks.",
      detailsTitle: "Solution & Process",
      detailsBody:
        "HireU designed an assessment-first hiring pipeline and delivered a focused shortlist matched to technical depth and founder expectations.",
      matterTitle: "Full Story Matter",
      matterBody:
        "FearsOff required a senior smart-contract auditor with strong Web3 security depth. HireU designed an assessment-first pipeline and delivered a successful final-round placement in 21 days.",
      impactTitle: "Results & Impact",
      impactBody:
        "Role closed in 21 days. The hire increased release confidence and reduced security-review bottlenecks across critical product cycles.",
      mediaUrl: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=88",
      mediaAlt: "Technical team working on smart contract auditing",
    },
    reverse: true,
  },
  {
    id: "custom",
    title: "Your New Case",
    role: "Add role from admin panel",
    summary: "Add summary text in the admin panel and it will appear here.",
    details: "Add detailed description in the admin panel.",
    highlight: "Add highlight metric here.",
    fullStoryMatter: "Add complete full story matter in the admin panel.",
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=90",
    imageAlt: "Professional team discussing roadmap",
    primaryLabel: "Open Case",
    primaryHref: "/cases/block/custom",
    fullStory: {
      headline: "Add full story headline in admin panel",
      brand: "Add brand name",
      summaryTitle: "Client Requirements",
      summaryBody: "Add summary section content for full story page.",
      detailsTitle: "Solution & Process",
      detailsBody: "Add details section content for full story page.",
      matterTitle: "Full Story Matter",
      matterBody: "Add complete full story matter in the admin panel.",
      impactTitle: "Results & Impact",
      impactBody: "Add impact section content for full story page.",
      mediaUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=90",
      mediaAlt: "Professional team discussing roadmap",
    },
    reverse: false,
  },
];

function safeString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeStoryHref(id: string, href: unknown) {
  if (typeof href !== "string") return `/cases/block/${encodeURIComponent(id)}`;
  const trimmed = href.trim();
  if (!trimmed) return `/cases/block/${encodeURIComponent(id)}`;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/cases/block/")) return trimmed;
  return `/cases/block/${encodeURIComponent(id)}`;
}

function toCaseBlock(value: unknown, fallback: CaseBlock, index: number): CaseBlock {
  if (!value || typeof value !== "object") return fallback;
  const input = value as Partial<CaseBlock>;
  const fullStoryInput = input.fullStory && typeof input.fullStory === "object" ? input.fullStory : {};
  const fullStoryFallback = fallback.fullStory;
  const resolvedFullStoryMatter = safeString(
    input.fullStoryMatter,
    safeString((fullStoryInput as Partial<CaseBlockFullStory>).matterBody, fallback.fullStoryMatter),
  );
  const resolvedId = safeString(input.id, `${fallback.id}-${index + 1}`);

  return {
    id: resolvedId,
    title: safeString(input.title, fallback.title),
    role: safeString(input.role, fallback.role),
    summary: safeString(input.summary, fallback.summary),
    details: safeString(input.details, fallback.details),
    highlight: safeString(input.highlight, fallback.highlight),
    fullStoryMatter: resolvedFullStoryMatter,
    imageUrl: safeString(input.imageUrl, fallback.imageUrl),
    imageAlt: safeString(input.imageAlt, fallback.imageAlt),
    primaryLabel: safeString(input.primaryLabel, fallback.primaryLabel),
    primaryHref: normalizeStoryHref(resolvedId, input.primaryHref),
    fullStory: {
      headline: safeString((fullStoryInput as Partial<CaseBlockFullStory>).headline, fullStoryFallback.headline),
      brand: safeString((fullStoryInput as Partial<CaseBlockFullStory>).brand, fullStoryFallback.brand),
      summaryTitle: safeString((fullStoryInput as Partial<CaseBlockFullStory>).summaryTitle, fullStoryFallback.summaryTitle),
      summaryBody: safeString((fullStoryInput as Partial<CaseBlockFullStory>).summaryBody, fullStoryFallback.summaryBody),
      detailsTitle: safeString((fullStoryInput as Partial<CaseBlockFullStory>).detailsTitle, fullStoryFallback.detailsTitle),
      detailsBody: safeString((fullStoryInput as Partial<CaseBlockFullStory>).detailsBody, fullStoryFallback.detailsBody),
      matterTitle: safeString((fullStoryInput as Partial<CaseBlockFullStory>).matterTitle, fullStoryFallback.matterTitle),
      matterBody: safeString((fullStoryInput as Partial<CaseBlockFullStory>).matterBody, resolvedFullStoryMatter),
      impactTitle: safeString((fullStoryInput as Partial<CaseBlockFullStory>).impactTitle, fullStoryFallback.impactTitle),
      impactBody: safeString((fullStoryInput as Partial<CaseBlockFullStory>).impactBody, fullStoryFallback.impactBody),
      mediaUrl: safeString((fullStoryInput as Partial<CaseBlockFullStory>).mediaUrl, fullStoryFallback.mediaUrl),
      mediaAlt: safeString((fullStoryInput as Partial<CaseBlockFullStory>).mediaAlt, fullStoryFallback.mediaAlt),
    },
    reverse: typeof input.reverse === "boolean" ? input.reverse : fallback.reverse,
  };
}

export function sanitizeCaseBlocks(value: unknown): CaseBlock[] {
  if (!Array.isArray(value)) return DEFAULT_CASE_BLOCKS;
  const template = DEFAULT_CASE_BLOCKS[DEFAULT_CASE_BLOCKS.length - 1];
  const sanitized = value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => toCaseBlock(item, DEFAULT_CASE_BLOCKS[index] ?? template, index));

  return sanitized.length > 0 ? sanitized : DEFAULT_CASE_BLOCKS;
}
