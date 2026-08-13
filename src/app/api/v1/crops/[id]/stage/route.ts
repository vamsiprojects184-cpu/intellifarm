import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  stage: z.enum([
    "PLANNED",
    "PLANTED",
    "GERMINATION",
    "VEGETATIVE",
    "FLOWERING",
    "FRUITING",
    "HARVEST_READY",
    "HARVESTED",
  ]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const crop = await db.crop.findUnique({
    where: { id },
    include: { farm: true },
  });
  if (!crop || crop.farm.ownerId !== user.id) return notFound("Crop not found");

  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;

  const before = crop.stage;
  const updated = await db.crop.update({
    where: { id },
    data: { stage: parsed.data.stage },
  });
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
  return ok(updated, "Crop stage updated");
}
