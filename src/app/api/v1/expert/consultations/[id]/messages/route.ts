import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  message: z.string().min(1),
});

export async function POST(
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
  if (
    (user.role === "FARMER" && consultation.farmerId !== user.id) ||
    (user.role === "EXPERT" &&
      consultation.expertId &&
      consultation.expertId !== user.expertProfile?.id)
  ) {
    return err("Not authorized", undefined, 403);
  }

  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;

  const msg = await db.consultationMessage.create({
    data: {
      consultationId: id,
      senderId: user.id,
      senderRole: user.role === "EXPERT" ? "EXPERT" : "FARMER",
      message: parsed.data.message,
    },
  });

  // Notify the other party
  const notifyUserId =
    user.role === "FARMER" ? consultation.expertId : consultation.farmerId;
  // expertId is ExpertProfile id, need user id
  let targetUserId: string | null = null;
  if (user.role === "FARMER" && consultation.expertId) {
    const ep = await db.expertProfile.findUnique({
      where: { id: consultation.expertId },
    });
    targetUserId = ep?.userId ?? null;
  } else if (user.role === "EXPERT") {
    targetUserId = consultation.farmerId;
  }
  if (targetUserId) {
    await db.notification.create({
      data: {
        userId: targetUserId,
        category: "EXPERT",
        title: "New message on consultation",
        message: parsed.data.message.slice(0, 200),
        priority: "MEDIUM",
      },
    });
  }

  // bump status
  await db.consultation.update({
    where: { id },
    data: {
      status:
        user.role === "EXPERT" ? "ANSWERED" : consultation.status === "ANSWERED" ? "IN_PROGRESS" : consultation.status,
    },
  });

  return ok(msg, "Message sent", 201);
}
