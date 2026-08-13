import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "DISMISSED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const rec = await db.recommendation.findUnique({ where: { id } });
  if (!rec || rec.userId !== user.id) return notFound("Recommendation not found");

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return notFound("Invalid status");

  const updated = await db.recommendation.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  return ok(updated, "Recommendation updated");
}
