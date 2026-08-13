import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  category: z.enum(["PLANTING", "IRRIGATION", "FERTILIZER", "PESTICIDE", "HARVEST", "INSPECTION", "OTHER"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const task = await db.farmTask.findUnique({ where: { id } });
  if (!task || task.userId !== user.id) return notFound("Task not found");

  const body = await safeJson(req);
  const parsed = validate(updateSchema, body);
  if (!parsed.ok) return parsed.error;

  const updated = await db.farmTask.update({
    where: { id },
    data: {
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      completedAt: parsed.data.completed === true ? new Date() : parsed.data.completed === false ? null : undefined,
    },
  });

  // If task completed, auto-log activity
  if (parsed.data.completed === true) {
    await db.farmActivity.create({
      data: {
        farmId: task.farmId,
        cropId: task.cropId ?? null,
        userId: user.id,
        type: "OTHER",
        title: `Task completed: ${task.title}`,
        description: task.description ?? undefined,
        isAuto: true,
      },
    });
  }

  return ok(updated, "Task updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const task = await db.farmTask.findUnique({ where: { id } });
  if (!task || task.userId !== user.id) return notFound("Task not found");
  await db.farmTask.delete({ where: { id } });
  return ok(null, "Task deleted");
}
