import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get("crop");
  const diseases = await db.diseaseDatabase.findMany({
    where: crop ? { cropName: { contains: crop } } : {},
    orderBy: [{ cropName: "asc" }, { diseaseName: "asc" }],
  });
  return ok(diseases);
}
