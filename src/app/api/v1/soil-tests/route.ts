import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const soilTestSchema = z.object({
  farmId: z.string().min(1),
  cropId: z.string().optional(),
  testDate: z.string().optional(),
  ph: z.number().min(0).max(14).optional(),
  nitrogen: z.number().min(0).optional(),
  phosphorus: z.number().min(0).optional(),
  potassium: z.number().min(0).optional(),
  organicCarbon: z.number().min(0).optional(),
  ec: z.number().min(0).optional(),
  sulfur: z.number().min(0).optional(),
  iron: z.number().min(0).optional(),
  zinc: z.number().min(0).optional(),
  boron: z.number().min(0).optional(),
  soilMoisture: z.number().min(0).max(100).optional(),
  texture: z.enum(["LOAMY", "CLAY", "SANDY", "SILT"]).optional(),
  labName: z.string().optional(),
  notes: z.string().optional(),
});

function computeFertility(d: z.infer<typeof soilTestSchema>): {
  fertility: string;
  recommendations: string;
} {
  let score = 0;
  const recs: string[] = [];

  if (d.ph !== undefined) {
    if (d.ph >= 6.5 && d.ph <= 7.5) score += 2;
    else if (d.ph >= 6.0 && d.ph <= 8.0) score += 1;
    else {
      recs.push(
        d.ph < 6.5
          ? "Soil is acidic (pH < 6.5). Apply agricultural lime (1-2 t/acre) to raise pH."
          : "Soil is alkaline (pH > 7.5). Apply gypsum or elemental sulfur to lower pH."
      );
    }
  }

  if (d.nitrogen !== undefined) {
    if (d.nitrogen >= 280) score += 2;
    else if (d.nitrogen >= 140) score += 1;
    else recs.push(`Low nitrogen (${d.nitrogen} kg/ha). Apply 50-80 kg urea/acre in split doses.`);
  }

  if (d.phosphorus !== undefined) {
    if (d.phosphorus >= 25) score += 2;
    else if (d.phosphorus >= 10) score += 1;
    else recs.push(`Low phosphorus (${d.phosphorus} kg/ha). Apply 40-60 kg SSP/acre or 20 kg DAP/acre.`);
  }

  if (d.potassium !== undefined) {
    if (d.potassium >= 280) score += 2;
    else if (d.potassium >= 140) score += 1;
    else recs.push(`Low potassium (${d.potassium} kg/ha). Apply 30-50 kg MOP/acre.`);
  }

  if (d.organicCarbon !== undefined) {
    if (d.organicCarbon >= 0.75) score += 2;
    else if (d.organicCarbon >= 0.4) score += 1;
    else recs.push(`Low organic carbon (${d.organicCarbon}%). Apply 5-10 t FYM/compost/acre.`);
  }

  const fertility = score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
  if (recs.length === 0) {
    recs.push("Soil nutrient levels are adequate. Maintain regular organic matter application.");
  }
  return { fertility, recommendations: JSON.stringify(recs) };
}

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

  const tests = await db.soilTest.findMany({
    where,
    orderBy: { testDate: "desc" },
    take: 50,
    include: {
      farm: { select: { id: true, name: true } },
      crop: { select: { id: true, name: true } },
    },
  });
  return ok(tests);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(soilTestSchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({ where: { id: parsed.data.farmId } });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const { fertility, recommendations } = computeFertility(parsed.data);
  const test = await db.soilTest.create({
    data: {
      ...parsed.data,
      testDate: parsed.data.testDate ? new Date(parsed.data.testDate) : new Date(),
      userId: user.id,
      fertility,
      recommendations,
    },
  });

  // Auto-log activity
  await db.farmActivity.create({
    data: {
      farmId: parsed.data.farmId,
      cropId: parsed.data.cropId ?? null,
      userId: user.id,
      type: "OTHER",
      title: "Soil test report added",
      description: `Fertility: ${fertility}. pH: ${parsed.data.ph ?? "—"}. NPK: ${parsed.data.nitrogen ?? "-"}/${parsed.data.phosphorus ?? "-"}/${parsed.data.potassium ?? "-"}`,
      isAuto: true,
    },
  });

  // If fertility is LOW, create a recommendation
  if (fertility === "LOW") {
    await db.recommendation.create({
      data: {
        userId: user.id,
        farmId: parsed.data.farmId,
        cropId: parsed.data.cropId ?? null,
        category: "FERTILIZER",
        title: "Low soil fertility detected",
        description: `Soil test shows LOW fertility. ${JSON.parse(recommendations).join(" ")}`,
        priority: "HIGH",
        source: "RULE_ENGINE",
      },
    });
    await db.notification.create({
      data: {
        userId: user.id,
        category: "SENSOR",
        title: "Soil fertility alert",
        message: `Soil test for ${farm.name} shows LOW fertility. View recommendations.`,
        priority: "HIGH",
      },
    });
  }

  return ok({ ...test, fertility, recommendations: JSON.parse(recommendations) }, "Soil test saved", 201);
}
