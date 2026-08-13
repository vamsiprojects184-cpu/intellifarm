import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.enum(["SEEDS", "FERTILIZER", "PESTICIDE", "FUEL", "TOOLS", "OTHER"]).optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().optional(),
  minStock: z.number().min(0).optional(),
  pricePerUnit: z.number().min(0).optional(),
  expiryDate: z.string().optional(),
  batchNo: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const item = await db.inventoryItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return notFound("Inventory item not found");

  const body = await safeJson(req);
  const parsed = validate(updateSchema, body);
  if (!parsed.ok) return parsed.error;

  const updated = await db.inventoryItem.update({
    where: { id },
    data: {
      ...parsed.data,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : undefined,
    },
  });
  return ok(updated, "Inventory item updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const item = await db.inventoryItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return notFound("Inventory item not found");
  await db.inventoryItem.delete({ where: { id } });
  return ok(null, "Inventory item deleted");
}
