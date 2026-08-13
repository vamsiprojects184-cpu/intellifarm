import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, forbidden, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  cropName: z.string().min(2),
  diseaseName: z.string().min(2),
  symptoms: z.string(),
  cause: z.string().optional(),
  severity: z.string(),
  treatment: z.string(),
  prevention: z.string(),
});

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return forbidden("Admin access required");
  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;
  const disease = await db.diseaseDatabase.create({ data: parsed.data });
  return ok(disease, "Disease added", 201);
}
