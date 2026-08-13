import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const sensorSchema = z.object({
  farmId: z.string().min(1),
  sensorId: z.string().min(1),
  name: z.string().min(2),
  type: z.enum(["SOIL_MOISTURE", "TEMPERATURE", "HUMIDITY", "WATER_LEVEL"]),
  location: z.string().optional(),
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

  const sensors = await db.sensor.findMany({
    where,
    include: {
      _count: { select: { readings: true } },
      readings: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(sensors);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(sensorSchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({
    where: { id: parsed.data.farmId },
  });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const sensor = await db.sensor.create({ data: parsed.data });
  return ok(sensor, "Sensor registered", 201);
}
