import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const itemSchema = z.object({
  farmId: z.string().min(1),
  name: z.string().min(2),
  category: z.enum(["SEEDS", "FERTILIZER", "PESTICIDE", "FUEL", "TOOLS", "OTHER"]),
  quantity: z.number().min(0),
  unit: z.string().default("kg"),
  minStock: z.number().min(0).default(0),
  pricePerUnit: z.number().min(0).optional(),
  purchaseDate: z.string().optional(),
  expiryDate: z.string().optional(),
  batchNo: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const category = searchParams.get("category");

  const where =
    user.role === "ADMIN"
      ? { ...(farmId ? { farmId } : {}), ...(category ? { category } : {}) }
      : { farm: { ownerId: user.id }, ...(farmId ? { farmId } : {}), ...(category ? { category } : {}) };

  const items = await db.inventoryItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { farm: { select: { id: true, name: true } } },
  });

  // Compute low-stock and expiring alerts
  const now = new Date();
  const soonExpiry = new Date(now.getTime() + 30 * 86400000);
  const lowStock = items.filter((i) => i.quantity <= i.minStock).length;
  const expiringSoon = items.filter((i) => i.expiryDate && new Date(i.expiryDate) <= soonExpiry).length;
  const totalValue = items.reduce((s, i) => s + (i.pricePerUnit ? i.pricePerUnit * i.quantity : 0), 0);

  return ok({
    items,
    summary: { total: items.length, lowStock, expiringSoon, totalValue: Math.round(totalValue) },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(itemSchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({ where: { id: parsed.data.farmId } });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const item = await db.inventoryItem.create({
    data: {
      ...parsed.data,
      purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : undefined,
      userId: user.id,
    },
  });
  return ok(item, "Inventory item added", 201);
}
