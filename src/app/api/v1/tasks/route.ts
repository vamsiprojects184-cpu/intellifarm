import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const taskSchema = z.object({
  farmId: z.string().min(1),
  cropId: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.enum(["PLANTING", "IRRIGATION", "FERTILIZER", "PESTICIDE", "HARVEST", "INSPECTION", "OTHER"]).default("OTHER"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.string(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const status = searchParams.get("status"); // pending / completed / overdue / today

  let where: any = { userId: user.id };
  if (user.role === "ADMIN") where = farmId ? { farmId } : {};
  else where = { userId: user.id, ...(farmId ? { farmId } : {}) };

  if (status === "pending") where.completed = false;
  else if (status === "completed") where.completed = true;

  const tasks = await db.farmTask.findMany({
    where,
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
    take: 100,
    include: {
      farm: { select: { id: true, name: true } },
      crop: { select: { id: true, name: true } },
    },
  });

  // Compute overdue/today counts
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const overdue = tasks.filter((t) => !t.completed && new Date(t.dueDate) < now).length;
  const dueToday = tasks.filter((t) => {
    const d = new Date(t.dueDate);
    return !t.completed && d >= now && d <= todayEnd;
  }).length;
  const pending = tasks.filter((t) => !t.completed).length;
  const completed = tasks.filter((t) => t.completed).length;

  return ok({
    tasks,
    summary: { total: tasks.length, pending, completed, overdue, dueToday },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(taskSchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({ where: { id: parsed.data.farmId } });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const task = await db.farmTask.create({
    data: {
      ...parsed.data,
      dueDate: new Date(parsed.data.dueDate),
      userId: user.id,
    },
  });

  return ok(task, "Task created", 201);
}
