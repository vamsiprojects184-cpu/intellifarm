import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const plotSchema = z.object({
  farmId: z.string().min(1),
  name: z.string().min(1),
  cropName: z.string().optional(),
  areaAcres: z.number().positive(),
  x: z.number().min(0).max(100).default(0),
  y: z.number().min(0).max(100).default(0),
  width: z.number().min(5).max(100).default(20),
  height: z.number().min(5).max(100).default(20),
  color: z.string().default("#16a34a"),
  soilType: z.string().optional(),
  currentCrop: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");

  const where =
    user.role === "ADMIN"
      ? farmId ? { farmId } : {}
      : { farm: { ownerId: user.id }, ...(farmId ? { farmId } : {}) };

  const plots = await db.farmPlot.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: { farm: { select: { id: true, name: true, areaAcres: true } } },
  });
  return ok(plots);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(plotSchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({ where: { id: parsed.data.farmId } });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const plot = await db.farmPlot.create({ data: parsed.data });
  return ok(plot, "Plot created", 201);
}
