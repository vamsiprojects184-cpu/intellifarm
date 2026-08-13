import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, err, unauthorized, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const farmSchema = z.object({
  name: z.string().min(2),
  state: z.string().min(2),
  district: z.string().min(2),
  village: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  areaAcres: z.number().positive(),
  soilType: z.string().optional(),
  irrigationType: z.string().optional(),
  waterSource: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("archived") === "true";

  if (user.role === "ADMIN") {
    const farms = await db.farm.findMany({
      where: includeArchived ? {} : { archived: false },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        _count: { select: { crops: true, sensors: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(farms);
  }

  const farms = await db.farm.findMany({
    where: {
      ownerId: user.id,
      ...(includeArchived ? {} : { archived: false }),
    },
    include: {
      _count: { select: { crops: true, sensors: true, activities: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(farms);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(farmSchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.create({
    data: { ...parsed.data, ownerId: user.id },
  });
  await db.farmActivity.create({
    data: {
      farmId: farm.id,
      type: "OTHER",
      title: `Farm "${farm.name}" created`,
      isAuto: true,
    },
  });
  return ok(farm, "Farm created successfully", 201);
}
