import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "TREATED", "MONITORING"]).optional(),
  treatment: z.string().optional(),
  treatmentDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const report = await db.pestReport.findUnique({ where: { id } });
  if (!report || report.userId !== user.id) return notFound("Pest report not found");

  const body = await safeJson(req);
  const parsed = validate(updateSchema, body);
  if (!parsed.ok) return parsed.error;

  const updated = await db.pestReport.update({
    where: { id },
    data: {
      ...parsed.data,
      treatmentDate: parsed.data.treatmentDate ? new Date(parsed.data.treatmentDate) : undefined,
    },
  });
  return ok(updated, "Pest report updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const report = await db.pestReport.findUnique({ where: { id } });
  if (!report || report.userId !== user.id) return notFound("Pest report not found");
  await db.pestReport.delete({ where: { id } });
  return ok(null, "Pest report deleted");
}
