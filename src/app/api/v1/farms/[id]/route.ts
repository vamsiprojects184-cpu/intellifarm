import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, err, unauthorized, forbidden, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

async function getOwnedFarm(id: string, userId: string, role: string) {
  const farm = await db.farm.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      crops: { orderBy: { createdAt: "desc" } },
      sensors: { orderBy: { createdAt: "desc" } },
      activities: { take: 10, orderBy: { createdAt: "desc" } },
      _count: {
        select: {
          crops: true,
          sensors: true,
          activities: true,
          diseaseReports: true,
          recommendations: true,
        },
      },
    },
  });
  if (!farm) return null;
  if (role !== "ADMIN" && farm.ownerId !== userId) return null;
  return farm;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const farm = await getOwnedFarm(id, user.id, user.role);
  if (!farm) return notFound("Farm not found");
  return ok(farm);
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
  village: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  areaAcres: z.number().positive().optional(),
  soilType: z.string().optional(),
  irrigationType: z.string().optional(),
  waterSource: z.string().optional(),
  description: z.string().optional(),
  archived: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const farm = await getOwnedFarm(id, user.id, user.role);
  if (!farm) return notFound("Farm not found");

  const body = await safeJson(req);
  const parsed = validate(updateSchema, body);
  if (!parsed.ok) return parsed.error;

  const updated = await db.farm.update({
    where: { id },
    data: parsed.data,
  });
  return ok(updated, "Farm updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const farm = await getOwnedFarm(id, user.id, user.role);
  if (!farm) return notFound("Farm not found");
  await db.farm.update({ where: { id }, data: { archived: true } });
  return ok(null, "Farm archived");
}

export const _ = { err, forbidden };
