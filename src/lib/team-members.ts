import prisma from "@/lib/prisma";

export type TeamMemberInput = {
  name: string;
  role: string;
  bio?: string;
  avatarUrl?: string | null;
  iconName?: string;
  tilt?: string;
  featured?: boolean;
  sortOrder?: number;
};

export async function listTeamMembers() {
  return prisma.teamMember.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function createTeamMember(input: TeamMemberInput) {
  const name = input.name.trim();
  const role = input.role.trim();
  if (!name || !role) throw new Error("Name and role are required");

  return prisma.$transaction(async (tx) => {
    const agg = await tx.teamMember.aggregate({ _max: { sortOrder: true } });
    const nextSort = (agg._max.sortOrder ?? -1) + 1;
    return tx.teamMember.create({
      data: {
        name,
        role,
        bio: (input.bio ?? "").trim(),
        avatarUrl: input.avatarUrl ? String(input.avatarUrl) : null,
        iconName: input.iconName ?? "Brain",
        tilt: input.tilt ?? "tilt-center",
        featured: input.featured === true,
        sortOrder: Number.isFinite(input.sortOrder) ? (input.sortOrder as number) : nextSort,
      },
    });
  });
}

export async function updateTeamMember(id: string, patch: Partial<TeamMemberInput>) {
  if (!id.trim()) throw new Error("id is required");

  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new Error("Name cannot be empty");
    data.name = name;
  }
  if (patch.role !== undefined) {
    const role = patch.role.trim();
    if (!role) throw new Error("Role cannot be empty");
    data.role = role;
  }
  if (patch.bio !== undefined) data.bio = patch.bio.trim();
  if (patch.avatarUrl !== undefined) data.avatarUrl = patch.avatarUrl ? String(patch.avatarUrl) : null;
  if (patch.iconName !== undefined) data.iconName = patch.iconName;
  if (patch.tilt !== undefined) data.tilt = patch.tilt;
  if (patch.featured !== undefined) data.featured = patch.featured === true;
  if (Number.isFinite(patch.sortOrder)) data.sortOrder = patch.sortOrder;

  if (Object.keys(data).length === 0) throw new Error("No fields to update");

  return prisma.teamMember.update({ where: { id }, data });
}

export async function deleteTeamMember(id: string) {
  if (!id.trim()) throw new Error("id is required");
  await prisma.teamMember.delete({ where: { id } });
}
