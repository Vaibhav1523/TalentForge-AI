import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ members });
  } catch (err) {
    console.error("[GET /api/team] Failed to fetch team members:", err);
    return NextResponse.json({ error: "Could not fetch team members" }, { status: 500 });
  }
}
