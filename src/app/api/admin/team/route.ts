import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/admin/is-platform-admin";
import {
  createTeamMember,
  deleteTeamMember,
  listTeamMembers,
  updateTeamMember,
} from "@/lib/team-members";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(await isPlatformAdmin(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await listTeamMembers();
  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isPlatformAdmin(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const member = await createTeamMember({
      name: String(body.name ?? ""),
      role: String(body.role ?? ""),
      bio: String(body.bio ?? ""),
      avatarUrl: body.avatarUrl ? String(body.avatarUrl) : null,
      iconName: String(body.iconName ?? "Brain"),
      tilt: String(body.tilt ?? "tilt-center"),
      featured: body.featured === true,
      sortOrder: Number.isFinite(body.sortOrder) ? (body.sortOrder as number) : undefined,
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create team member";
    if (message.includes("required") || message.includes("empty")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[admin/team POST]", err);
    return NextResponse.json({ error: "Failed to create team member" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isPlatformAdmin(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const member = await updateTeamMember(id, {
      name: body.name !== undefined ? String(body.name) : undefined,
      role: body.role !== undefined ? String(body.role) : undefined,
      bio: body.bio !== undefined ? String(body.bio) : undefined,
      avatarUrl: body.avatarUrl !== undefined ? (body.avatarUrl ? String(body.avatarUrl) : null) : undefined,
      iconName: body.iconName !== undefined ? String(body.iconName) : undefined,
      tilt: body.tilt !== undefined ? String(body.tilt) : undefined,
      featured: body.featured !== undefined ? body.featured === true : undefined,
      sortOrder: Number.isFinite(body.sortOrder) ? (body.sortOrder as number) : undefined,
    });
    return NextResponse.json({ member });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("required") || message.includes("empty") || message.includes("No fields")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    console.error("[admin/team PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isPlatformAdmin(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await deleteTeamMember(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    console.error("[admin/team DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
