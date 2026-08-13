import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");
  const category = searchParams.get("category");
  const level = searchParams.get("level");
  const q = searchParams.get("q");

  const where: {
    state?: string;
    category?: string;
    level?: string;
    OR?: { name: { contains: string } }[] | { description: { contains: string } }[];
    isActive?: boolean;
  } = { isActive: true };
  if (state && state !== "ALL") where.state = state;
  if (category) where.category = category;
  if (level) where.level = level;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const schemes = await db.governmentScheme.findMany({
    where,
    orderBy: { lastUpdated: "desc" },
  });
  return ok(schemes);
}
