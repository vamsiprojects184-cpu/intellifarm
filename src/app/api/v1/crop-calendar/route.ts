import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season"); // KHARIF / RABI / ZAID
  const month = Number(searchParams.get("month") ?? (new Date().getMonth() + 1));

  const where: { season?: string } = {};
  if (season) where.season = season;

  const crops = await db.cropDatabase.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Indian cropping seasons by month
  // Kharif: Jun-Oct, Rabi: Nov-Mar, Zaid: Apr-Jun
  const currentSeason =
    month >= 6 && month <= 10
      ? "KHARIF"
      : month >= 11 || month <= 3
      ? "RABI"
      : "ZAID";

  // Recommended planting months per season
  const plantingWindow: Record<string, { start: string; end: string }> = {
    KHARIF: { start: "June", end: "July" },
    RABI: { start: "October", end: "November" },
    ZAID: { start: "March", end: "April" },
  };

  const enriched = crops.map((c) => ({
    ...c,
    currentSeasonSuitable: c.season === "ALL" || c.season === currentSeason,
    plantingWindow: plantingWindow[c.season] ?? plantingWindow.KHARIF,
  }));

  return ok({
    crops: enriched,
    currentMonth: month,
    currentSeason,
    seasons: ["KHARIF", "RABI", "ZAID"],
    seasonInfo: {
      KHARIF: { name: "Kharif (Monsoon)", months: "Jun–Oct", crops: "Rice, Maize, Cotton, Soybean, Groundnut" },
      RABI: { name: "Rabi (Winter)", months: "Nov–Mar", crops: "Wheat, Gram, Mustard, Onion, Potato" },
      ZAID: { name: "Zaid (Summer)", months: "Apr–Jun", crops: "Vegetables, Fruits, Fodder" },
    },
  });
}
