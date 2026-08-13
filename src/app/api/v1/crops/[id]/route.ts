import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound, forbidden, validate, safeJson } from "@/lib/api";
import { z } from "zod";

async function authorizeCrop(id: string, userId: string, role: string) {
  const crop = await db.crop.findUnique({
    where: { id },
    include: { farm: true },
  });
  if (!crop) return null;
  if (role !== "ADMIN" && crop.farm.ownerId !== userId) return null;
  return crop;
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  variety: z.string().optional(),
  plantingDate: z.string().transform((v) => new Date(v)).optional(),
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
    .optional(),
  areaAcres: z.number().positive().optional(),
  health: z
    .enum(["EXCELLENT", "GOOD", "NEEDS_ATTENTION", "CRITICAL"])
    .optional(),
  notes: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const crop = await authorizeCrop(id, user.id, user.role);
  if (!crop) return notFound("Crop not found");
  return ok(crop);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const crop = await authorizeCrop(id, user.id, user.role);
  if (!crop) return notFound("Crop not found");
  const body = await safeJson(req);
  const parsed = validate(updateSchema, body);
  if (!parsed.ok) return parsed.error;

  const before = crop.stage;
  const updated = await db.crop.update({
    where: { id },
    data: parsed.data,
  });
  if (parsed.data.stage && parsed.data.stage !== before) {
    await db.farmActivity.create({
      data: {
        farmId: crop.farmId,
        cropId: crop.id,
        userId: user.id,
        type: "OTHER",
        title: `${crop.name} stage: ${before} → ${parsed.data.stage}`,
        isAuto: true,
      },
    });
  }
  return ok(updated, "Crop updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const crop = await authorizeCrop(id, user.id, user.role);
  if (!crop) return notFound("Crop not found");
  await db.crop.delete({ where: { id } });
  return ok(null, "Crop deleted");
}

export const _ = { forbidden };
