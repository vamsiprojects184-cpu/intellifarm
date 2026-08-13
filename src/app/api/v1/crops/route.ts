import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, err, unauthorized, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const cropSchema = z.object({
  farmId: z.string().min(1),
  name: z.string().min(2),
  variety: z.string().optional(),
  plantingDate: z.string().transform((v) => new Date(v)),
  expectedHarvest: z.string().transform((v) => new Date(v)).optional(),
  stage: z
    .enum([
      "PLANNED",
      "PLANTED",
      "GERMINATION",
      "VEGETATIVE",
      "FLOWERING",
      "FRUITING",
      "HARVEST_READY",
      "HARVESTED",
    ])
    .default("PLANNED"),
  areaAcres: z.number().positive(),
  health: z
    .enum(["EXCELLENT", "GOOD", "NEEDS_ATTENTION", "CRITICAL"])
    .default("GOOD"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");

  if (user.role === "ADMIN") {
    const crops = await db.crop.findMany({
      where: farmId ? { farmId } : {},
      include: { farm: { select: { id: true, name: true, ownerId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok(crops);
  }

  const crops = await db.crop.findMany({
    where: {
      ...(farmId ? { farmId } : {}),
      farm: { ownerId: user.id, archived: false },
    },
    include: { farm: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(crops);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(cropSchema, body);
  if (!parsed.ok) return parsed.error;

  // ownership check
  const farm = await db.farm.findUnique({
    where: { id: parsed.data.farmId },
  });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned by you", undefined, 404);
  }

  const crop = await db.crop.create({ data: parsed.data });
  await db.farmActivity.create({
    data: {
      farmId: crop.farmId,
      cropId: crop.id,
      userId: user.id,
      type: "PLANTING",
      title: `Crop "${crop.name}" added`,
      description: crop.variety
        ? `Variety: ${crop.variety}, ${crop.areaAcres} acres, stage ${crop.stage}`
        : `${crop.areaAcres} acres, stage ${crop.stage}`,
      isAuto: true,
    },
  });
  return ok(crop, "Crop added successfully", 201);
}

export const _ = { err };
