import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, forbidden, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  eligibility: z.string().optional(),
  benefits: z.string().optional(),
  requiredDocs: z.string().optional(),
  applicationProcess: z.string().optional(),
  officialSource: z.string().optional(),
  officialUrl: z.string().optional(),
  state: z.string().optional(),
  category: z.string().optional(),
  level: z.enum(["CENTRAL", "STATE"]).optional(),
  isActive: z.boolean().optional(),
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
  const updated = await db.governmentScheme.update({
    where: { id },
    data: { ...parsed.data, lastUpdated: new Date() },
  });
  return ok(updated, "Scheme updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return forbidden("Admin access required");
  const { id } = await params;
  await db.governmentScheme.delete({ where: { id } });
  return ok(null, "Scheme deleted");
}

export const _ = { notFound };
