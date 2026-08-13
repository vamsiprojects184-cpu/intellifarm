import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get("crop");
  const marketId = searchParams.get("marketId");
  const state = searchParams.get("state");
  const days = Number(searchParams.get("days") ?? "7");

  const where: {
    cropName?: { contains: string };
    marketId?: string;
    market?: { state?: string };
  } = {};
  if (crop) where.cropName = { contains: crop };
  if (marketId) where.marketId = marketId;
  if (state) where.market = { state };

  const since = new Date();
  since.setDate(since.getDate() - days);

  const prices = await db.marketPrice.findMany({
    where: { ...where, priceDate: { gte: since } },
    orderBy: { priceDate: "desc" },
    include: { market: true },
    take: 500,
  });
  // flag demo
  const isDemo = prices.length > 0 ? prices.every((p) => p.isDemo) : true;
  return ok({ prices, isDemo });
}

export async function getMarkets() {
  return db.market.findMany({ orderBy: { name: "asc" } });
}
