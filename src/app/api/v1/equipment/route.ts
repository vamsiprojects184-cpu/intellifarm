import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const equipmentSchema = z.object({
  farmId: z.string().min(1),
  name: z.string().min(2),
  category: z.enum(["TRACTOR", "PUMP", "SPRAYER", "HARVESTER", "TILLER", "IRRIGATION", "OTHER"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "BROKEN", "SOLD"]).default("ACTIVE"),
  lastService: z.string().optional(),
  nextService: z.string().optional(),
  hoursUsed: z.number().min(0).optional(),
  fuelType: z.enum(["DIESEL", "PETROL", "ELECTRIC", "MANUAL"]).optional(),
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

  const equipment = await db.equipment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { farm: { select: { id: true, name: true } } },
  });
  return ok(equipment);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(equipmentSchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({ where: { id: parsed.data.farmId } });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const equipment = await db.equipment.create({
    data: {
      ...parsed.data,
      purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined,
      lastService: parsed.data.lastService ? new Date(parsed.data.lastService) : undefined,
      nextService: parsed.data.nextService ? new Date(parsed.data.nextService) : undefined,
      userId: user.id,
    },
  });
  return ok(equipment, "Equipment added", 201);
}
