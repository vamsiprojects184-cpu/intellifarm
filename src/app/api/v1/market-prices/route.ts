import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get("crop");
  const marketId = searchParams.get("marketId");
  const state = searchParams.get("state");
  const days = Number(searchParams.get("days") ?? "30");

  const where: any = {};
  if (crop && crop !== "all" && crop !== "ALL") {
    where.cropName = { contains: crop, mode: "insensitive" };
  }
  if (marketId && marketId !== "all" && marketId !== "ALL") {
    where.marketId = marketId;
  }
  if (state && state !== "all" && state !== "ALL") {
    where.market = { state: { contains: state, mode: "insensitive" } };
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Try finding prices within the days window
  let prices = await db.marketPrice.findMany({
    where: { ...where, priceDate: { gte: since } },
    orderBy: { priceDate: "desc" },
    include: { market: true },
    take: 500,
  });

  // If no prices found in the recent window, fallback to latest records
  if (prices.length === 0) {
    prices = await db.marketPrice.findMany({
      where,
      orderBy: { priceDate: "desc" },
      include: { market: true },
      take: 500,
    });
  }

  const demoCount = prices.filter((p) => p.isDemo).length;
  const isDemo = prices.length > 0 ? demoCount === prices.length : true;
  const isPartialDemo = demoCount > 0 && demoCount < prices.length;
  return ok({ prices, isDemo, isPartialDemo, demoCount, total: prices.length });
}

export async function getMarkets() {
  return db.market.findMany({ orderBy: { name: "asc" } });
}