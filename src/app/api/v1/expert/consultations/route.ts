import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  category: z.enum([
    "CROP_DISEASE",
    "IRRIGATION",
    "SOIL",
    "FERTILIZER",
    "PEST",
    "GENERAL",
  ]),
  subject: z.string().min(3),
  question: z.string().min(10),
  imageUrl: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let where = {};
  if (user.role === "FARMER") {
    where = { farmerId: user.id, ...(status ? { status } : {}) };
  } else if (user.role === "EXPERT") {
    where = {
      OR: [{ expertId: null }, { expertId: user.expertProfile?.id }],
      ...(status ? { status } : {}),
    };
  } else {
    where = status ? { status } : {};
  }

  const consultations = await db.consultation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      farmer: { select: { id: true, fullName: true, state: true, district: true } },
      expert: { include: { user: { select: { fullName: true } } } },
      _count: { select: { messages: true } },
    },
  });
  return ok(consultations);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "FARMER") {
    return err("Only farmers can create consultations", undefined, 403);
  }
  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;

  const consultation = await db.consultation.create({
    data: {
      farmerId: user.id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      question: parsed.data.question,
      imageUrl: parsed.data.imageUrl,
      status: "OPEN",
    },
  });
  await db.consultationMessage.create({
    data: {
      consultationId: consultation.id,
      senderId: user.id,
      senderRole: "FARMER",
      message: parsed.data.question,
    },
  });
  return ok(consultation, "Consultation submitted", 201);
}
