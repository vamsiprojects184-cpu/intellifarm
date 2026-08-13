import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const where = { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) };
  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unreadCount = await db.notification.count({
    where: { userId: user.id, isRead: false },
  });
  return ok({ notifications, unreadCount });
}
