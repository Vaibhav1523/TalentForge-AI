/**
 * Seeds four contract / C2H roles (D365 FO, Rave, Agile TPM, Kotlin) into MongoDB via Prisma.
 *
 * Run from frontend/:  npm run seed:sourced-contract-roles
 *
 * Env: DATABASE_URL (via .env). Optional: RECRUITER_ID, COMPANY_NAME, COMPANY_SLUG
 * (defaults match other seed scripts).
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const RECRUITER_ID =
  process.env.RECRUITER_ID || process.env.COMPANY_ID || "69a5426c5eb1a053566bf872";

const SOURCE_NOTE =
  "\n\n—\nSource brief (public market listing): see URL in job metadata; apply via HookStep for our managed process.";

const jobs = [
  {
    title: "MS D365 Finance & Operations Developer",
    location: "Remote — India",
    category: "Engineering",
    type: "Contract",
    exp: [7, 10],
    salaryBand: "Budget: Open (INR). Indicative market: 1.50–1.80 LPM (lakh/month).",
    sourceUrl: "https://tinyurl.com/297vn8fs",
    skills: [
      "Dynamics 365 F&O",
      "X++",
      ".NET",
      "SQL Server",
      "Azure DevOps",
      "Dual Write",
      "DMF",
      "Dataverse",
      "ERP implementation",
    ],
    desc:
      "Contract · 7+ years · Remote (India). Champion best programming practices throughout implementation of new solutions. Provide development solutions within D365 FO; bring experience from large-scale ERP implementations. Excel in business requirement analysis; business process mapping, modelling, and documentation. Engage with Microsoft preview releases (Dual Write, RSAT). Review technical architecture deliverables; take technical responsibility for implementations; surface cross-area / cross-release issues. Collaborate with Solution Architect and stakeholders.\n\n" +
      "Requirements: 6+ years .NET; proficient X++; strong SQL; full lifecycle F&O including X++ and .NET; extension of internal D365 FO frameworks; ISV solutions; Azure DevOps (repos, pipelines); Azure for cloud-hosted environments; integrations (custom web services, Dataverse, DMF, Power Platform, Dual Write); client-facing delivery. Approx. 7–8 years relevant development." +
      SOURCE_NOTE,
  },
  {
    title: "Rave Developer (Jeppesen Rostering)",
    location: "Remote — India",
    category: "Engineering",
    type: "Contract",
    exp: [5, 8],
    salaryBand: "Budget: Open (INR). Indicative market: 1.40–1.70 LPM (lakh/month).",
    sourceUrl: "https://tinyurl.com/yuwnjdaf",
    skills: [
      "Jeppesen Rostering",
      "RAVE",
      "Studio configuration",
      "Linux shell scripting",
      "Crew scheduling",
      "Aviation operations",
    ],
    desc:
      "Contract (6+ months) · 5–8 years · Remote (India). Develop and maintain solutions in Jeppesen Rostering: Studio configuration, RAVE development, Linux shell automation, crew rules (availability, assignments, regulatory constraints), rostering engine support. Contribute to training pilot bidding (PBS-style), PTB and internal apps; work with SMEs, crew planners, and vendors.\n\n" +
      "Required: strong Jeppesen Rostering experience; Studio + RAVE; crew scheduling/rostering systems; Linux scripting; airline ops concepts (pairing, pilot bidding)." +
      SOURCE_NOTE,
  },
  {
    title: "Agile Technology Project Manager",
    location: "Chennai, Tamil Nadu, India (onsite)",
    category: "Project Management",
    type: "Contract",
    exp: [8, 12],
    salaryBand: "Budget: Open (INR). Indicative market: 1.20–1.50 LPM (lakh/month).",
    sourceUrl: "https://tinyurl.com/2752px9f",
    skills: [
      "Scaled Agile",
      "SAFe",
      "Scrum",
      "Kanban",
      "ServiceNow IRM",
      "GRC",
      "Application integration",
      "Stakeholder management",
    ],
    desc:
      "8+ years · Chennai onsite · Contract 6+ months with C2H potential. Drive roadmap using scaled agile; lead integration of legacy and modern apps into ServiceNow IRM; liaison between PMO, IT, Risk, and Compliance; translate requirements into epics/stories; manage sprints, backlog, and global dependencies. Flexible hours for US stakeholder overlap.\n\n" +
      "Qualifications: packaged software implementation projects; ServiceNow IRM not required (any GRC helpful); strong integration and data-mapping project background; Agile (SAFe/Scrum/Kanban)." +
      SOURCE_NOTE,
  },
  {
    title: "Kotlin Developer",
    location: "Remote — India",
    category: "Engineering",
    type: "Contract",
    exp: [7, 10],
    salaryBand: "Budget: Client-specified (INR); max not disclosed in source brief.",
    sourceUrl: "https://tinyurl.com/ywywsrww",
    skills: [
      "Kotlin",
      "Android",
      "Debugging",
      "Business logic extraction",
      "Mobile development",
    ],
    desc:
      "3-month contract · Remote (India) · 7+ years overall, minimum 5 years Kotlin. Focus on debugging and extracting business logic from existing systems.\n\n" +
      "Immediate joiners preferred where possible." +
      SOURCE_NOTE,
  },
];

async function main() {
  const recruiter = await prisma.user.findUnique({
    where: { id: RECRUITER_ID },
    select: { companyName: true, companySlug: true },
  });
  if (!recruiter) {
    console.error(
      `No user found for RECRUITER_ID=${RECRUITER_ID}. Set RECRUITER_ID in .env to your recruiter User id.`
    );
    process.exit(1);
  }

  const companyName =
    recruiter.companyName || process.env.COMPANY_NAME || "HookStep";
  const slug =
    recruiter.companySlug || process.env.COMPANY_SLUG || "hookstep";

  const base = process.env.NEXT_PUBLIC_APP_DOMAIN || "https://hookstep.in";
  const origin = base.startsWith("http") ? base : `https://${base}`;

  const created = [];
  for (const job of jobs) {
    const description =
      job.desc +
      `\n\nReference link: ${job.sourceUrl}\n${job.salaryBand}`;

    const row = await prisma.job.create({
      data: {
        title: job.title,
        company: companyName,
        location: job.location,
        description,
        employmentType: job.type,
        category: job.category,
        skills: job.skills,
        salary: job.salaryBand,
        currency: "INR",
        experienceMin: job.exp[0],
        experienceMax: job.exp[1],
        companyId: RECRUITER_ID,
        status: "ACTIVE",
      },
    });
    created.push({
      id: row.id,
      title: job.title,
      url: `${origin.replace(/\/$/, "")}/jobs/${slug}/${row.id}`,
    });
    console.log(`${job.title}\n  → ${created[created.length - 1].url}\n`);
  }

  console.log(`Done: ${created.length} jobs for ${companyName} (slug: ${slug}).`);
  return created;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
