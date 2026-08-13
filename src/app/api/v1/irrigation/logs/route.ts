import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  farmId: z.string().min(1),
  cropId: z.string().optional(),
  waterLitres: z.number().positive(),
  durationMin: z.number().int().positive(),
  method: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");

  const where =
    user.role === "ADMIN"
      ? farmId
        ? { farmId }
        : {}
      : { farm: { ownerId: user.id }, ...(farmId ? { farmId } : {}) };

  const logs = await db.irrigationLog.findMany({
    where,
    orderBy: { performedAt: "desc" },
    take: 100,
    include: { farm: { select: { id: true, name: true } } },
  });
  return ok(logs);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({
    where: { id: parsed.data.farmId },
  });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const log = await db.irrigationLog.create({
    data: { ...parsed.data, userId: user.id },
  });
  await db.farmActivity.create({
    data: {
      farmId: parsed.data.farmId,
      cropId: parsed.data.cropId,
      userId: user.id,
      type: "IRRIGATION",
      title: `Irrigation logged — ${parsed.data.waterLitres}L`,
      description: `${parsed.data.durationMin} min via ${parsed.data.method ?? "N/A"}`,
      isAuto: true,
    },
  });
  return ok(log, "Irrigation logged", 201);
}
