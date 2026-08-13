import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const harvestSchema = z.object({
  farmId: z.string().min(1),
  cropId: z.string().min(1),
  harvestDate: z.string().optional(),
  quantityKg: z.number().positive(),
  areaAcres: z.number().positive(),
  quality: z.enum(["EXCELLENT", "GOOD", "AVERAGE", "POOR"]).default("GOOD"),
  salePrice: z.number().min(0).optional(),
  expenses: z.number().min(0).optional(),
  buyer: z.string().optional(),
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
      : { userId: user.id, ...(farmId ? { farmId } : {}) };

  const harvests = await db.harvest.findMany({
    where,
    orderBy: { harvestDate: "desc" },
    take: 50,
    include: {
      farm: { select: { id: true, name: true } },
      crop: { select: { id: true, name: true, variety: true } },
    },
  });

  // Compute totals
  const totalYield = harvests.reduce((sum, h) => sum + h.quantityKg, 0);
  const totalIncome = harvests.reduce((sum, h) => sum + (h.totalIncome ?? 0), 0);
  const totalProfit = harvests.reduce((sum, h) => sum + (h.netProfit ?? 0), 0);
  const avgYieldPerAcre = harvests.length
    ? harvests.reduce((s, h) => s + h.yieldPerAcre, 0) / harvests.length
    : 0;

  return ok({
    harvests,
    summary: {
      totalHarvests: harvests.length,
      totalYieldKg: Math.round(totalYield),
      totalIncome: Math.round(totalIncome),
      totalProfit: Math.round(totalProfit),
      avgYieldPerAcre: Math.round(avgYieldPerAcre),
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(harvestSchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({ where: { id: parsed.data.farmId } });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const crop = await db.crop.findUnique({ where: { id: parsed.data.cropId } });
  if (!crop || crop.farmId !== parsed.data.farmId) {
    return err("Crop not found on this farm", undefined, 404);
  }

  const yieldPerAcre = parsed.data.quantityKg / parsed.data.areaAcres;
  const totalIncome = parsed.data.salePrice
    ? parsed.data.quantityKg * parsed.data.salePrice
    : undefined;
  const netProfit =
    totalIncome !== undefined && parsed.data.expenses !== undefined
      ? totalIncome - parsed.data.expenses
      : undefined;

  const harvest = await db.harvest.create({
    data: {
      ...parsed.data,
      harvestDate: parsed.data.harvestDate ? new Date(parsed.data.harvestDate) : new Date(),
      userId: user.id,
      yieldPerAcre,
      totalIncome,
      netProfit,
    },
  });

  // Auto-log activity
  await db.farmActivity.create({
    data: {
      farmId: parsed.data.farmId,
      cropId: parsed.data.cropId,
      userId: user.id,
      type: "HARVEST",
      title: `${crop.name} harvested — ${parsed.data.quantityKg} kg`,
      description: `${parsed.data.areaAcres} acres, ${Math.round(yieldPerAcre)} kg/acre, quality ${parsed.data.quality}${totalIncome ? `, income ₹${Math.round(totalIncome).toLocaleString()}` : ""}`,
      isAuto: true,
    },
  });

  // Update crop stage to HARVESTED
  await db.crop.update({
    where: { id: parsed.data.cropId },
    data: { stage: "HARVESTED" },
  });

  return ok(harvest, "Harvest logged", 201);
}
