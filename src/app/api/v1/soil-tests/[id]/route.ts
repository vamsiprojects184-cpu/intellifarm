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
  const test = await db.soilTest.findUnique({
    where: { id },
    include: { farm: true },
  });
  if (!test || test.farm.ownerId !== user.id)
    return notFound("Soil test not found");
  await db.soilTest.delete({ where: { id } });
  return ok(null, "Soil test deleted");
}
