import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  specialization: z.string().min(2),
  experience: z.number().int().min(0).optional(),
  qualification: z.string().optional(),
  bio: z.string().optional(),
});

export async function GET() {
  const experts = await db.expertProfile.findMany({
    include: { user: { select: { id: true, fullName: true, email: true, state: true, district: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(experts);
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "EXPERT")
    return err("Only experts can edit expert profile", undefined, 403);
  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;

  const updated = await db.expertProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      specialization: parsed.data.specialization,
      experience: parsed.data.experience ?? 0,
      qualification: parsed.data.qualification,
      bio: parsed.data.bio,
    },
    update: {
      specialization: parsed.data.specialization,
      experience: parsed.data.experience,
      qualification: parsed.data.qualification,
      bio: parsed.data.bio,
    },
  });
  return ok(updated, "Expert profile updated");
}
