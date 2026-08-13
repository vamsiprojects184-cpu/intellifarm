import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export async function GET() {
  const markets = await db.market.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { prices: true } } },
  });
  return ok(markets);
}
