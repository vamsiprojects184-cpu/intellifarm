import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";
import { analyzeIrrigation } from "@/lib/irrigation-engine";

const schema = z.object({
  farmId: z.string().min(1),
  cropId: z.string().optional(),
  // optional overrides
  soilMoisture: z.number().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({
    where: { id: parsed.data.farmId },
    include: {
      crops: parsed.data.cropId
        ? { where: { id: parsed.data.cropId } }
        : { orderBy: { createdAt: "desc" }, take: 1 },
      sensors: {
        include: {
          readings: { orderBy: { timestamp: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!farm) return notFound("Farm not found");
  if (farm.ownerId !== user.id) return err("Not your farm", undefined, 403);

  const result = await analyzeIrrigation({
    farm,
    overrides: {
      soilMoisture: parsed.data.soilMoisture,
      temperature: parsed.data.temperature,
      humidity: parsed.data.humidity,
    },
  });

  return ok(result, "Irrigation analysis complete");
}
