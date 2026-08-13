import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound } from "@/lib/api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const sensor = await db.sensor.findUnique({
    where: { id },
    include: { farm: true },
  });
  if (!sensor || sensor.farm.ownerId !== user.id)
    return notFound("Sensor not found");
  await db.sensor.delete({ where: { id } });
  return ok(null, "Sensor removed");
}
