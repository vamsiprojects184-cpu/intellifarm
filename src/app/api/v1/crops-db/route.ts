import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const crops = await db.cropDatabase.findMany({
    where: q ? { name: { contains: q } } : {},
    orderBy: { name: "asc" },
  });
  return ok(crops);
}
