import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const activitySchema = z.object({
  farmId: z.string().min(1),
  cropId: z.string().optional(),
  type: z.string().min(2),
  title: z.string().min(2),
  description: z.string().optional(),
  metadata: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const limit = Number(searchParams.get("limit") ?? "50");

  const where =
    user.role === "ADMIN"
      ? farmId
        ? { farmId }
        : {}
      : { farm: { ownerId: user.id }, ...(farmId ? { farmId } : {}) };

  const activities = await db.farmActivity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
    include: {
      crop: { select: { id: true, name: true } },
      farm: { select: { id: true, name: true } },
    },
  });
  return ok(activities);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(activitySchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({
    where: { id: parsed.data.farmId },
  });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const activity = await db.farmActivity.create({
    data: { ...parsed.data, userId: user.id },
  });
  return ok(activity, "Activity logged", 201);
}
