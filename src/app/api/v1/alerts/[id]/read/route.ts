import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const alert = await db.alert.findUnique({ where: { id } });
  if (!alert) return notFound("Alert not found");
  if (alert.userId && alert.userId !== user.id && user.role !== "ADMIN")
    return notFound("Alert not found");
  const updated = await db.alert.update({
    where: { id },
    data: { isRead: true },
  });
  return ok(updated, "Marked as read");
}
