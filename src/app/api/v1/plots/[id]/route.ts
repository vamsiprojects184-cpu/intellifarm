import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  cropName: z.string().optional(),
  areaAcres: z.number().positive().optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  width: z.number().min(5).max(100).optional(),
  height: z.number().min(5).max(100).optional(),
  color: z.string().optional(),
  soilType: z.string().optional(),
  currentCrop: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const plot = await db.farmPlot.findUnique({ where: { id }, include: { farm: true } });
  if (!plot || plot.farm.ownerId !== user.id) return notFound("Plot not found");

  const body = await safeJson(req);
  const parsed = validate(updateSchema, body);
  if (!parsed.ok) return parsed.error;

  const updated = await db.farmPlot.update({ where: { id }, data: parsed.data });
  return ok(updated, "Plot updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const plot = await db.farmPlot.findUnique({ where: { id }, include: { farm: true } });
  if (!plot || plot.farm.ownerId !== user.id) return notFound("Plot not found");
  await db.farmPlot.delete({ where: { id } });
  return ok(null, "Plot deleted");
}
