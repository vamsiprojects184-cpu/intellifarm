import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";
import { getDiseaseAnalysisService } from "@/lib/disease-service";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  farmId: z.string().min(1),
  cropId: z.string().optional(),
  cropName: z.string().min(1),
  imageUrl: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const where =
    user.role === "ADMIN"
      ? farmId
        ? { farmId }
        : {}
      : { userId: user.id, ...(farmId ? { farmId } : {}) };
  const reports = await db.diseaseReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { farm: { select: { id: true, name: true } } },
  });
  return ok(reports);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({
    where: { id: parsed.data.farmId },
  });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const service = getDiseaseAnalysisService();
  let analysis;
  try {
    analysis = await service.analyze(parsed.data.imageUrl);
  } catch (e) {
    console.error("Disease analysis failed:", e);
    return err(
      "Disease analysis service unavailable. Please try again later.",
      undefined,
      502
    );
  }

  const report = await db.diseaseReport.create({
    data: {
      farmId: parsed.data.farmId,
      cropId: parsed.data.cropId,
      userId: user.id,
      imageUrl: parsed.data.imageUrl,
      cropName: parsed.data.cropName,
      predictedDisease: analysis.predictedDisease,
      confidence: analysis.confidence,
      severity: analysis.severity,
      symptoms: analysis.symptoms,
      recommendedAction: analysis.recommendedAction,
      preventionTips: analysis.preventionTips,
      status: "ANALYZED",
    },
  });

  // Auto-create activity, alert, recommendation, notification
  await db.farmActivity.create({
    data: {
      farmId: parsed.data.farmId,
      cropId: parsed.data.cropId ?? null,
      userId: user.id,
      type: "DISEASE_SCAN",
      title: `Disease scan: ${
        analysis.predictedDisease ?? "No disease detected"
      }`,
      description: `Crop: ${parsed.data.cropName}, Confidence: ${Math.round(
        analysis.confidence * 100
      )}%, Severity: ${analysis.severity}`,
      isAuto: true,
    },
  });

  const priority =
    analysis.severity === "SEVERE"
      ? "CRITICAL"
      : analysis.severity === "HIGH"
      ? "HIGH"
      : analysis.severity === "MODERATE"
      ? "MEDIUM"
      : "LOW";

  if (analysis.predictedDisease) {
    await db.recommendation.create({
      data: {
        userId: user.id,
        farmId: parsed.data.farmId,
        cropId: parsed.data.cropId ?? null,
        category: "DISEASE",
        title: `${analysis.predictedDisease} detected`,
        description: analysis.recommendedAction,
        priority,
        status: "PENDING",
        source: "VLM",
      },
    });
    await db.alert.create({
      data: {
        userId: user.id,
        farmId: parsed.data.farmId,
        category: "DISEASE",
        title: `${analysis.predictedDisease} detected on ${parsed.data.cropName}`,
        message: `Severity: ${analysis.severity}. Action: ${analysis.recommendedAction.slice(
          0,
          160
        )}`,
        priority,
      },
    });
    await db.notification.create({
      data: {
        userId: user.id,
        category: "DISEASE",
        title: "Disease analysis complete",
        message: `${analysis.predictedDisease} detected with ${Math.round(
          analysis.confidence * 100
        )}% confidence.`,
        priority,
      },
    });
  }

  return ok(
    {
      report,
      disclaimer:
        "AI-generated analysis. Please consult an agricultural expert for critical crop decisions.",
    },
    "Disease analysis complete",
    201
  );
}
