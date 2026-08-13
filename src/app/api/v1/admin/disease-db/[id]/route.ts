import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, forbidden, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  cropName: z.string().optional(),
  diseaseName: z.string().optional(),
  symptoms: z.string().optional(),
  cause: z.string().optional(),
  severity: z.string().optional(),
  treatment: z.string().optional(),
  prevention: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return forbidden("Admin access required");
  const { id } = await params;
  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;
  const updated = await db.diseaseDatabase.update({ where: { id }, data: parsed.data });
  return ok(updated, "Disease updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return forbidden("Admin access required");
  const { id } = await params;
  await db.diseaseDatabase.delete({ where: { id } });
  return ok(null, "Disease deleted");
}

export const _ = { notFound };
