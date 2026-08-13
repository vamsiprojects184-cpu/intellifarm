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
  const harvest = await db.harvest.findUnique({
    where: { id },
    include: { farm: true },
  });
  if (!harvest || harvest.farm.ownerId !== user.id)
    return notFound("Harvest not found");
  await db.harvest.delete({ where: { id } });
  return ok(null, "Harvest deleted");
}
