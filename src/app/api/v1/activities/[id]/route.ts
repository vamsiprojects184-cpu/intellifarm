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
  const activity = await db.farmActivity.findUnique({
    where: { id },
    include: { farm: true },
  });
  if (!activity || activity.farm.ownerId !== user.id)
    return notFound("Activity not found");
  await db.farmActivity.delete({ where: { id } });
  return ok(null, "Activity deleted");
}
