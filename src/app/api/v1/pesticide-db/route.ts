import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pest = searchParams.get("pest");
  const crop = searchParams.get("crop");

  const where: { pestName?: { contains: string }; cropName?: { contains: string } } = {};
  if (pest) where.pestName = { contains: pest };
  if (crop) where.cropName = { contains: crop };

  const pesticides = await db.pesticideDatabase.findMany({
    where,
    orderBy: [{ cropName: "asc" }, { pestName: "asc" }],
  });
  return ok(pesticides);
}
