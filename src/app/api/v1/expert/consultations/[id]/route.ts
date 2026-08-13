import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["ACCEPT", "ANSWER", "CLOSE", "IN_PROGRESS"]),
  message: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const consultation = await db.consultation.findUnique({
    where: { id },
    include: {
      farmer: { select: { id: true, fullName: true, state: true, district: true } },
      expert: { include: { user: { select: { fullName: true } } } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!consultation) return notFound("Consultation not found");
  if (
    user.role === "FARMER" &&
    consultation.farmerId !== user.id
  )
    return notFound("Consultation not found");
  if (
    user.role === "EXPERT" &&
    consultation.expertId &&
    consultation.expertId !== user.expertProfile?.id
  )
    return notFound("Consultation not found");
  return ok(consultation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const consultation = await db.consultation.findUnique({
    where: { id },
  });
  if (!consultation) return notFound("Consultation not found");

  // Authorization
  if (user.role === "FARMER" && consultation.farmerId !== user.id) {
    return err("Not authorized", undefined, 403);
  }
  if (
    user.role === "EXPERT" &&
    consultation.expertId &&
    consultation.expertId !== user.expertProfile?.id
  ) {
    return err("Not assigned to you", undefined, 403);
  }

  const body = await safeJson(req);
  const parsed = validate(actionSchema, body);
  if (!parsed.ok) return parsed.error;
  const { action, message } = parsed.data;

  let newStatus = consultation.status;
  let expertId = consultation.expertId;

  if (action === "ACCEPT" && user.role === "EXPERT") {
    expertId = user.expertProfile?.id ?? null;
    newStatus = "IN_PROGRESS";
    if (!consultation.expertId) {
      await db.expertProfile.update({
        where: { id: user.expertProfile!.id },
        data: { totalConsultations: { increment: 1 } },
      });
    }
  } else if (action === "ANSWER" && user.role === "EXPERT") {
    // Auto-assign expert if not already assigned
    if (!expertId && user.expertProfile?.id) {
      expertId = user.expertProfile.id;
      await db.expertProfile.update({
        where: { id: user.expertProfile.id },
        data: { totalConsultations: { increment: 1 } },
      });
    }
    newStatus = "ANSWERED";
  } else if (action === "IN_PROGRESS" && user.role === "EXPERT") {
    if (!expertId && user.expertProfile?.id) {
      expertId = user.expertProfile.id;
    }
    newStatus = "IN_PROGRESS";
  } else if (action === "CLOSE") {
    newStatus = "CLOSED";
  }

  const updated = await db.consultation.update({
    where: { id },
    data: { status: newStatus, expertId },
  });

  if (message) {
    await db.consultationMessage.create({
      data: {
        consultationId: id,
        senderId: user.id,
        senderRole: user.role === "EXPERT" ? "EXPERT" : "FARMER",
        message,
      },
    });
    // notify farmer
    await db.notification.create({
      data: {
        userId: consultation.farmerId,
        category: "EXPERT",
        title: "New reply on your consultation",
        message: message.slice(0, 200),
        priority: "MEDIUM",
      },
    });
  }

  return ok(updated, "Consultation updated");
}
