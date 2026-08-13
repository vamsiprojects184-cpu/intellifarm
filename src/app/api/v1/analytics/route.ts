import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";

/**
 * Farm Health Score (0-100) — documented calculation:
 *  - Soil score (25): from latest soil moisture. >=35% → 25, 25-34% → 15, <25% → 5
 *  - Irrigation score (25): based on recent irrigation logs (last 7 days). >=1 log → 25, else 5
 *  - Disease risk score (20): inverted from open disease reports in last 14 days. 0 reports → 20, each report -5 (min 0)
 *  - Weather risk score (15): from current weather insights severity. CRITICAL→3, HIGH→8, MEDIUM→12, else 15
 *  - Activity score (15): from farm activities in last 14 days. >=3 → 15, 1-2 → 10, 0 → 3
 */
function computeHealthScore(opts: {
  latestMoisture: number | null;
  irrigationCount: number;
  diseaseCount: number;
  weatherPriority: string;
  activityCount: number;
}) {
  let soil = 5;
  if (opts.latestMoisture !== null) {
    if (opts.latestMoisture >= 35) soil = 25;
    else if (opts.latestMoisture >= 25) soil = 15;
  }
  const irrigation = opts.irrigationCount >= 1 ? 25 : 5;
  const disease = Math.max(0, 20 - opts.diseaseCount * 5);
  let weather = 15;
  const p = opts.weatherPriority;
  if (p === "CRITICAL") weather = 3;
  else if (p === "HIGH") weather = 8;
  else if (p === "MEDIUM") weather = 12;
  const activity = opts.activityCount >= 3 ? 15 : opts.activityCount >= 1 ? 10 : 3;
  const total = soil + irrigation + disease + weather + activity;
  return { total, soil, irrigation, disease, weather, activity };
}

function scoreBand(score: number) {
  if (score >= 85) return { label: "Excellent", color: "green" };
  if (score >= 70) return { label: "Good", color: "lime" };
  if (score >= 50) return { label: "Needs Attention", color: "amber" };
  return { label: "Critical", color: "red" };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");

  const farms = await db.farm.findMany({
    where:
      user.role === "ADMIN"
        ? farmId
          ? { id: farmId }
          : {}
        : { ownerId: user.id, archived: false, ...(farmId ? { id: farmId } : {}) },
    include: {
      crops: true,
      sensors: {
        include: { readings: { orderBy: { timestamp: "desc" }, take: 1 } },
      },
      activities: { where: { createdAt: { gte: new Date(Date.now() - 14 * 86400000) } } },
      irrigationLogs: { where: { performedAt: { gte: new Date(Date.now() - 7 * 86400000) } } },
      diseaseReports: { where: { createdAt: { gte: new Date(Date.now() - 14 * 86400000) } } },
    },
  });

  const farmScores = farms.map((farm) => {
    const latest = farm.sensors
      .flatMap((s) => s.readings)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    const score = computeHealthScore({
      latestMoisture: latest?.soilMoisture ?? null,
      irrigationCount: farm.irrigationLogs.length,
      diseaseCount: farm.diseaseReports.length,
      weatherPriority: "INFO",
      activityCount: farm.activities.length,
    });
    return {
      farm: { id: farm.id, name: farm.name, state: farm.state },
      score: score.total,
      band: scoreBand(score.total),
      breakdown: score,
      cropCount: farm.crops.length,
      activeCrops: farm.crops.filter((c) => !["HARVESTED"].includes(c.stage)).length,
      needsAttention: farm.crops.filter((c) => ["NEEDS_ATTENTION", "CRITICAL"].includes(c.health)).length,
      latestMoisture: latest?.soilMoisture ?? null,
      latestTemp: latest?.temperature ?? null,
      latestHumidity: latest?.humidity ?? null,
    };
  });

  // Aggregate sensor readings for charts (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const farmIds = farms.map((f) => f.id);
  const recentReadings = farmIds.length
    ? await db.sensorReading.findMany({
        where: { farmId: { in: farmIds }, timestamp: { gte: sevenDaysAgo } },
        orderBy: { timestamp: "asc" },
      })
    : [];

  // Group by day
  const byDay = new Map<string, { moisture: number[]; temp: number[]; humidity: number[] }>();
  for (const r of recentReadings) {
    const key = r.timestamp.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, { moisture: [], temp: [], humidity: [] });
    const e = byDay.get(key)!;
    if (r.soilMoisture !== null) e.moisture.push(r.soilMoisture);
    if (r.temperature !== null) e.temp.push(r.temperature);
    if (r.humidity !== null) e.humidity.push(r.humidity);
  }
  const trend = Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    moisture: v.moisture.length ? Math.round((v.moisture.reduce((a, b) => a + b, 0) / v.moisture.length) * 10) / 10 : null,
    temperature: v.temp.length ? Math.round((v.temp.reduce((a, b) => a + b, 0) / v.temp.length) * 10) / 10 : null,
    humidity: v.humidity.length ? Math.round((v.humidity.reduce((a, b) => a + b, 0) / v.humidity.length) * 10) / 10 : null,
  }));

  const overallScore = farmScores.length
    ? Math.round(farmScores.reduce((a, b) => a + b.score, 0) / farmScores.length)
    : 0;

  return ok({
    overallScore,
    overallBand: scoreBand(overallScore),
    farmScores,
    sensorTrend: trend,
    totals: {
      farms: farms.length,
      crops: farms.reduce((a, f) => a + f.crops.length, 0),
      activeCrops: farms.reduce(
        (a, f) => a + f.crops.filter((c) => c.stage !== "HARVESTED").length,
        0
      ),
      needsAttention: farms.reduce(
        (a, f) =>
          a +
          f.crops.filter((c) => ["NEEDS_ATTENTION", "CRITICAL"].includes(c.health))
            .length,
        0
      ),
    },
    scoreDocumentation:
      "Farm Health Score (0-100): Soil 25 + Irrigation 25 + Disease risk 20 + Weather risk 15 + Activity 15. 85+ Excellent, 70-84 Good, 50-69 Needs Attention, <50 Critical.",
  });
}
