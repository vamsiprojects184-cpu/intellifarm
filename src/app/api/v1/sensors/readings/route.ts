import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const readingSchema = z.object({
  farmId: z.string().min(1),
  sensorId: z.string().optional(),
  soilMoisture: z.number().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  waterLevel: z.number().optional(),
  isManual: z.boolean().default(true),
  // IoT mode: sensorId may reference an external device; we look it up by sensorId.
  // For manual mode, sensorId is the db sensor id.
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const limit = Number(searchParams.get("limit") ?? "100");

  const where =
    user.role === "ADMIN"
      ? farmId
        ? { farmId }
        : {}
      : { farm: { ownerId: user.id }, ...(farmId ? { farmId } : {}) };

  const readings = await db.sensorReading.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: Math.min(limit, 500),
  });
  return ok(readings);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const body = await safeJson(req);
  const parsed = validate(readingSchema, body);
  if (!parsed.ok) return parsed.error;

  // Authorize farm
  let ownerId: string | undefined;
  if (user) {
    const farm = await db.farm.findUnique({
      where: { id: parsed.data.farmId },
    });
    if (!farm || farm.ownerId !== user.id) {
      return err("Farm not found or not owned", undefined, 404);
    }
    ownerId = user.id;
  }
  // Note: IoT ingestion without a user session is allowed in dev. In production
  // you'd validate an API key per device here.

  // Resolve sensor
  let sensor;
  if (parsed.data.sensorId) {
    sensor = await db.sensor.findFirst({
      where: {
        OR: [
          { id: parsed.data.sensorId },
          { sensorId: parsed.data.sensorId },
        ],
        farmId: parsed.data.farmId,
      },
    });
  }
  if (!sensor) {
    // auto-create a virtual sensor if missing
    sensor = await db.sensor.create({
      data: {
        farmId: parsed.data.farmId,
        sensorId: parsed.data.sensorId ?? `AUTO-${Date.now()}`,
        name: "Auto-registered sensor",
        type: "SOIL_MOISTURE",
      },
    });
  }

  // Anomaly detection (rule-based)
  let isAnomaly = false;
  let anomalyNote: string | undefined;
  const sm = parsed.data.soilMoisture;
  const t = parsed.data.temperature;
  if (sm !== undefined && sm < 20) {
    isAnomaly = true;
    anomalyNote = "Very low soil moisture (<20%)";
  }
  if (t !== undefined && t > 40) {
    isAnomaly = true;
    anomalyNote = (anomalyNote ? anomalyNote + "; " : "") + "Very high temperature (>40°C)";
  }

  const reading = await db.sensorReading.create({
    data: {
      sensorId: sensor.id,
      farmId: parsed.data.farmId,
      reportedBy: ownerId,
      soilMoisture: parsed.data.soilMoisture,
      temperature: parsed.data.temperature,
      humidity: parsed.data.humidity,
      waterLevel: parsed.data.waterLevel,
      isManual: parsed.data.isManual,
      isAnomaly,
      anomalyNote,
    },
  });

  // Auto-create alert + recommendation if anomaly
  if (isAnomaly && ownerId) {
    await db.alert.create({
      data: {
        userId: ownerId,
        farmId: parsed.data.farmId,
        category: "SENSOR",
        title: "Sensor anomaly detected",
        message: anomalyNote ?? "Abnormal sensor reading",
        priority: "HIGH",
      },
    });
    await db.notification.create({
      data: {
        userId: ownerId,
        category: "SENSOR",
        title: "Sensor anomaly detected",
        message: anomalyNote ?? "Abnormal sensor reading detected on your farm.",
        priority: "HIGH",
      },
    });
  }

  return ok(reading, "Sensor reading recorded", 201);
}
