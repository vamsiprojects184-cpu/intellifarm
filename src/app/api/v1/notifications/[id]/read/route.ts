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
  const notif = await db.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== user.id) return notFound("Notification not found");
  const updated = await db.notification.update({
    where: { id },
    data: { isRead: true },
  });
  return ok(updated, "Marked as read");
}
