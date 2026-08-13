import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, forbidden, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  eligibility: z.string(),
  benefits: z.string(),
  requiredDocs: z.string(),
  applicationProcess: z.string(),
  officialSource: z.string(),
  officialUrl: z.string().optional(),
  state: z.string().default("ALL"),
  category: z.string(),
  level: z.enum(["CENTRAL", "STATE"]).default("CENTRAL"),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return forbidden("Admin access required");
  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;
  const scheme = await db.governmentScheme.create({ data: parsed.data });
  return ok(scheme, "Scheme created", 201);
}
