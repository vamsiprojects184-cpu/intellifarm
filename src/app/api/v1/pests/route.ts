import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const pestSchema = z.object({
  farmId: z.string().min(1),
  cropId: z.string().optional(),
  pestName: z.string().min(2),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "SEVERE"]).default("MEDIUM"),
  affectedArea: z.number().positive().optional(),
  observedDate: z.string().optional(),
  treatment: z.string().optional(),
  treatmentDate: z.string().optional(),
  status: z.enum(["ACTIVE", "TREATED", "MONITORING"]).default("ACTIVE"),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const status = searchParams.get("status");

  const where =
    user.role === "ADMIN"
      ? { ...(farmId ? { farmId } : {}), ...(status ? { status } : {}) }
      : { userId: user.id, ...(farmId ? { farmId } : {}), ...(status ? { status } : {}) };

  const reports = await db.pestReport.findMany({
    where,
    orderBy: { observedDate: "desc" },
    take: 50,
    include: {
      farm: { select: { id: true, name: true } },
      crop: { select: { id: true, name: true } },
    },
  });
  return ok(reports);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(pestSchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({ where: { id: parsed.data.farmId } });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const report = await db.pestReport.create({
    data: {
      ...parsed.data,
      observedDate: parsed.data.observedDate ? new Date(parsed.data.observedDate) : new Date(),
      treatmentDate: parsed.data.treatmentDate ? new Date(parsed.data.treatmentDate) : undefined,
      userId: user.id,
    },
  });

  await db.farmActivity.create({
    data: {
      farmId: parsed.data.farmId,
      cropId: parsed.data.cropId ?? null,
      userId: user.id,
      type: "PESTICIDE",
      title: `Pest observed: ${parsed.data.pestName}`,
      description: `Severity: ${parsed.data.severity}${parsed.data.affectedArea ? `, ${parsed.data.affectedArea} acres` : ""}`,
      isAuto: true,
    },
  });

  if (parsed.data.severity === "SEVERE" || parsed.data.severity === "HIGH") {
    await db.alert.create({
      data: {
        userId: user.id,
        farmId: parsed.data.farmId,
        category: "DISEASE",
        title: `${parsed.data.severity} pest infestation: ${parsed.data.pestName}`,
        message: `Pest ${parsed.data.pestName} detected with ${parsed.data.severity} severity. Take immediate action.`,
        priority: parsed.data.severity === "SEVERE" ? "CRITICAL" : "HIGH",
      },
    });
  }

  return ok(report, "Pest report logged", 201);
}
