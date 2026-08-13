import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const where =
    user.role === "ADMIN"
      ? unreadOnly
        ? { isRead: false }
        : {}
      : { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) };
  const alerts = await db.alert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { farm: { select: { id: true, name: true } } },
  });
  return ok(alerts);
}
