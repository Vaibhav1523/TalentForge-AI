import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSuperAdminByEmail, wouldStripLastSuperAdmin } from "@/lib/admin/super-admin-core";

const ENV_SUPER = () => (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(await isSuperAdminByEmail(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const superEmail = ENV_SUPER();

  const dbAdmins = await prisma.user.findMany({
    where: { isAdmin: true },
    select: { id: true, email: true, name: true, isAdmin: true, isSuperAdmin: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const admins = dbAdmins.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? "Unnamed",
    isSuperAdmin: u.isSuperAdmin === true || (!!superEmail && u.email.toLowerCase() === superEmail),
    source: "db" as const,
    addedAt: u.createdAt,
  }));

  const envEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const envOnlyAdmins = envEmails
    .filter((e) => !dbAdmins.some((d) => d.email.toLowerCase() === e))
    .map((e) => ({
      id: null,
      email: e,
      name: "Env Config",
      isSuperAdmin: !!superEmail && e === superEmail,
      source: "env" as const,
      addedAt: null,
    }));

  return NextResponse.json({
    superAdminEmail: superEmail,
    admins: [...envOnlyAdmins, ...admins],
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isSuperAdminByEmail(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
  const role = body.role === "super" ? "super" : "admin";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isAdmin: true, isSuperAdmin: true },
  });

  if (!user) {
    return NextResponse.json({ error: "No user found with this email. They must sign up first." }, { status: 404 });
  }

  if (user.isAdmin && role === "admin" && !user.isSuperAdmin) {
    return NextResponse.json({ error: "This user is already an admin." }, { status: 409 });
  }

  if (user.isAdmin && user.isSuperAdmin && role === "super") {
    return NextResponse.json({ error: "This user is already a super admin." }, { status: 409 });
  }

  if (user.isAdmin && !user.isSuperAdmin && role === "super") {
    await prisma.user.update({
      where: { email },
      data: { isSuperAdmin: true, isAdmin: true },
    });
    return NextResponse.json({ success: true, email, name: user.name, role: "super" });
  }

  if (!user.isAdmin) {
    await prisma.user.update({
      where: { email },
      data: {
        isAdmin: true,
        isSuperAdmin: role === "super",
      },
    });
    return NextResponse.json({ success: true, email, name: user.name, role });
  }

  return NextResponse.json({ error: "This user is already an admin." }, { status: 409 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isSuperAdminByEmail(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  if (await wouldStripLastSuperAdmin(email)) {
    return NextResponse.json(
      {
        error:
          "Cannot remove the last super admin. Set SUPER_ADMIN_EMAIL in the server environment or promote another super admin first.",
      },
      { status: 403 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isAdmin: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!user.isAdmin) {
    return NextResponse.json({ error: "This user is not an admin." }, { status: 409 });
  }

  await prisma.user.update({
    where: { email },
    data: { isAdmin: false, isSuperAdmin: false },
  });

  return NextResponse.json({ success: true, email });
}
