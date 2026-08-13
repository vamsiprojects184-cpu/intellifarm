import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.enum(["TRACTOR", "PUMP", "SPRAYER", "HARVESTER", "TILLER", "IRRIGATION", "OTHER"]).optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "BROKEN", "SOLD"]).optional(),
  lastService: z.string().optional(),
  nextService: z.string().optional(),
  hoursUsed: z.number().min(0).optional(),
  fuelType: z.enum(["DIESEL", "PETROL", "ELECTRIC", "MANUAL"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const item = await db.equipment.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return notFound("Equipment not found");

  const body = await safeJson(req);
  const parsed = validate(updateSchema, body);
  if (!parsed.ok) return parsed.error;

  const updated = await db.equipment.update({
    where: { id },
    data: {
      ...parsed.data,
      lastService: parsed.data.lastService ? new Date(parsed.data.lastService) : undefined,
      nextService: parsed.data.nextService ? new Date(parsed.data.nextService) : undefined,
    },
  });
  return ok(updated, "Equipment updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const item = await db.equipment.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return notFound("Equipment not found");
  await db.equipment.delete({ where: { id } });
  return ok(null, "Equipment deleted");
}
