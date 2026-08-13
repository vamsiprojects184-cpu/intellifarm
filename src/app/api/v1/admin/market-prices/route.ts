import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, forbidden, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  cropName: z.string().min(2),
  marketId: z.string().min(1),
  minPrice: z.number().positive(),
  maxPrice: z.number().positive(),
  modalPrice: z.number().positive(),
  priceDate: z.string().transform((v) => new Date(v)),
  isDemo: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return forbidden("Admin access required");
  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;
  const price = await db.marketPrice.create({ data: parsed.data });
  return ok(price, "Market price added", 201);
}
