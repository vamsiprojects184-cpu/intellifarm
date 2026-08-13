import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";

/**
 * Yield Benchmark — compares farmer's harvest yield per acre against
 * standard/benchmark yields for the same crop.
 *
 * Standard yields (kg/acre) based on Indian average agricultural data.
 */

const STANDARD_YIELDS: Record<string, { average: number; good: number; excellent: number; unit: string }> = {
  Rice: { average: 2000, good: 2800, excellent: 3500, unit: "kg/acre" },
  Wheat: { average: 1800, good: 2500, excellent: 3200, unit: "kg/acre" },
  Maize: { average: 2000, good: 2800, excellent: 3500, unit: "kg/acre" },
  Tomato: { average: 8000, good: 12000, excellent: 16000, unit: "kg/acre" },
  Onion: { average: 10000, good: 15000, excellent: 20000, unit: "kg/acre" },
  Cotton: { average: 500, good: 800, excellent: 1200, unit: "kg lint/acre" },
  Soybean: { average: 800, good: 1200, excellent: 1600, unit: "kg/acre" },
  Groundnut: { average: 800, good: 1200, excellent: 1600, unit: "kg/acre" },
  Sugarcane: { average: 30000, good: 40000, excellent: 50000, unit: "kg/acre" },
  Potato: { average: 8000, good: 12000, excellent: 16000, unit: "kg/acre" },
  Chilli: { average: 800, good: 1200, excellent: 1800, unit: "kg dry/acre" },
  Banana: { average: 12000, good: 18000, excellent: 25000, unit: "kg/acre" },
  Gram: { average: 600, good: 900, excellent: 1200, unit: "kg/acre" },
  Mustard: { average: 800, good: 1200, excellent: 1600, unit: "kg/acre" },
  Brinjal: { average: 8000, good: 12000, excellent: 16000, unit: "kg/acre" },
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const harvests = await db.harvest.findMany({
    where: { userId: user.id },
    include: {
      crop: { select: { id: true, name: true, variety: true } },
      farm: { select: { id: true, name: true } },
    },
    orderBy: { harvestDate: "desc" },
    take: 50,
  });

  // Group by crop name and compute averages
  const byCrop = new Map<string, { name: string; yields: number[]; harvestCount: number; totalKg: number; totalIncome: number; totalProfit: number }>();
  for (const h of harvests) {
    const name = h.crop?.name ?? "Unknown";
    if (!byCrop.has(name)) {
      byCrop.set(name, { name, yields: [], harvestCount: 0, totalKg: 0, totalIncome: 0, totalProfit: 0 });
    }
    const e = byCrop.get(name)!;
    e.yields.push(h.yieldPerAcre);
    e.harvestCount++;
    e.totalKg += h.quantityKg;
    e.totalIncome += h.totalIncome ?? 0;
    e.totalProfit += h.netProfit ?? 0;
  }

  const benchmarks = Array.from(byCrop.values()).map((c) => {
    const avgYield = c.yields.reduce((a, b) => a + b, 0) / c.yields.length;
    const maxYield = Math.max(...c.yields);
    const minYield = Math.min(...c.yields);
    const standard = STANDARD_YIELDS[c.name];
    const percentile = standard
      ? avgYield >= standard.excellent
        ? 100
        : avgYield >= standard.good
        ? 75
        : avgYield >= standard.average
        ? 50
        : 25
      : null;

    let rating = "—";
    let ratingColor = "muted";
    if (standard) {
      if (avgYield >= standard.excellent) {
        rating = "Excellent";
        ratingColor = "emerald";
      } else if (avgYield >= standard.good) {
        rating = "Good";
        ratingColor = "lime";
      } else if (avgYield >= standard.average) {
        rating = "Average";
        ratingColor = "amber";
      } else {
        rating = "Below Average";
        ratingColor = "red";
      }
    }

    return {
      cropName: c.name,
      yourAvgYield: Math.round(avgYield),
      yourMinYield: Math.round(minYield),
      yourMaxYield: Math.round(maxYield),
      harvestCount: c.harvestCount,
      totalKg: Math.round(c.totalKg),
      totalIncome: Math.round(c.totalIncome),
      totalProfit: Math.round(c.totalProfit),
      standardAverage: standard?.average ?? null,
      standardGood: standard?.good ?? null,
      standardExcellent: standard?.excellent ?? null,
      unit: standard?.unit ?? "kg/acre",
      percentile,
      rating,
      ratingColor,
      hasStandard: !!standard,
    };
  });

  // All standard yields for reference
  const standards = Object.entries(STANDARD_YIELDS).map(([name, data]) => ({
    cropName: name,
    average: data.average,
    good: data.good,
    excellent: data.excellent,
    unit: data.unit,
  }));

  return ok({ benchmarks, standards });
}
