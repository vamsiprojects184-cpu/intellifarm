import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get("crop");
  const stage = searchParams.get("stage");

  const where: { cropName?: string; growthStage?: string } = {};
  if (crop) where.cropName = { contains: crop };
  if (stage) where.growthStage = stage;

  const recs = await db.fertilizerRecommendation.findMany({
    where,
    orderBy: { cropName: "asc" },
  });
  return ok(recs);
}
