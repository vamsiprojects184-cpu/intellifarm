import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, forbidden } from "@/lib/api";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return forbidden("Admin access required");
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const q = searchParams.get("q");

  const where: {
    role?: string;
    OR?: { fullName: { contains: string } }[] | { email: { contains: string } }[];
  } = {};
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      role: true,
      state: true,
      district: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      _count: { select: { farms: true } },
    },
  });
  return ok(users);
}

export const _ = { unauthorized };
