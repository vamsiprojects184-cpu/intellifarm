import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "DISMISSED"]),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const farmId = searchParams.get("farmId");

  const where: {
    userId: string;
    status?: string;
    farmId?: string;
  } = { userId: user.id };
  if (status) where.status = status;
  if (farmId) where.farmId = farmId;

  const recs = await db.recommendation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { farm: { select: { id: true, name: true } }, crop: { select: { id: true, name: true } } },
  });
  return ok(recs);
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return err("id required");
  const body = await safeJson(req);
  const parsed = validate(updateSchema, body);
  if (!parsed.ok) return parsed.error;

  const rec = await db.recommendation.findUnique({ where: { id } });
  if (!rec || rec.userId !== user.id) return err("Not found", undefined, 404);

  const updated = await db.recommendation.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  return ok(updated, "Recommendation updated");
}

/** Generate recommendations for a user (rule-based, called from dashboard refresh) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const farmId = (body as { farmId?: string })?.farmId;

  const farms = await db.farm.findMany({
    where: { ownerId: user.id, archived: false, ...(farmId ? { id: farmId } : {}) },
    include: {
      crops: { orderBy: { createdAt: "desc" }, take: 3 },
      sensors: { include: { readings: { orderBy: { timestamp: "desc" }, take: 1 } } },
    },
  });

  const created = [];
  for (const farm of farms) {
    const latest = farm.sensors
      .flatMap((s) => s.readings)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    if (latest?.soilMoisture !== undefined && latest.soilMoisture < 30) {
      const exists = await db.recommendation.findFirst({
        where: {
          userId: user.id,
          farmId: farm.id,
          category: "IRRIGATION",
          title: { contains: "Low soil moisture" },
          createdAt: { gte: new Date(Date.now() - 6 * 3600 * 1000) },
        },
      });
      if (!exists) {
        created.push(
          await db.recommendation.create({
            data: {
              userId: user.id,
              farmId: farm.id,
              category: "IRRIGATION",
              title: "Low soil moisture — irrigate today",
              description: `Soil moisture at ${Math.round(
                latest.soilMoisture
              )}% is below optimal. Apply drip irrigation.`,
              priority: "HIGH",
              source: "RULE_ENGINE",
            },
          })
        );
      }
    }
    if (latest?.humidity !== undefined && latest.humidity > 80) {
      const exists = await db.recommendation.findFirst({
        where: {
          userId: user.id,
          farmId: farm.id,
          category: "DISEASE",
          title: { contains: "High humidity" },
          createdAt: { gte: new Date(Date.now() - 12 * 3600 * 1000) },
        },
      });
      if (!exists) {
        created.push(
          await db.recommendation.create({
            data: {
              userId: user.id,
              farmId: farm.id,
              category: "DISEASE",
              title: "High humidity — fungal risk",
              description: `Humidity at ${Math.round(
                latest.humidity
              )}% favours fungal diseases. Inspect lower leaves.`,
              priority: "MEDIUM",
              source: "RULE_ENGINE",
            },
          })
        );
      }
    }
  }

  return ok({ generated: created.length, recommendations: created }, "Recommendations refreshed");
}
