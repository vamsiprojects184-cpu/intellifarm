import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const expenseSchema = z.object({
  farmId: z.string().min(1),
  cropId: z.string().optional(),
  category: z.enum(["SEEDS", "FERTILIZER", "PESTICIDE", "LABOR", "FUEL", "EQUIPMENT", "IRRIGATION", "LAND_RENT", "OTHER"]),
  description: z.string().min(2),
  amount: z.number().positive(),
  expenseDate: z.string().optional(),
  vendor: z.string().optional(),
  paymentMode: z.enum(["CASH", "UPI", "BANK", "CREDIT"]).optional(),
  receiptNo: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const category = searchParams.get("category");

  const where =
    user.role === "ADMIN"
      ? { ...(farmId ? { farmId } : {}), ...(category ? { category } : {}) }
      : { userId: user.id, ...(farmId ? { farmId } : {}), ...(category ? { category } : {}) };

  const [expenses, totals] = await Promise.all([
    db.farmExpense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      take: 100,
      include: {
        farm: { select: { id: true, name: true } },
        crop: { select: { id: true, name: true } },
      },
    }),
    db.farmExpense.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
  ]);

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = totals.map((t) => ({ category: t.category, total: t._sum.amount ?? 0 }));

  return ok({ expenses, summary: { total: Math.round(totalAmount), count: expenses.length, byCategory } });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(expenseSchema, body);
  if (!parsed.ok) return parsed.error;

  const farm = await db.farm.findUnique({ where: { id: parsed.data.farmId } });
  if (!farm || farm.ownerId !== user.id) {
    return err("Farm not found or not owned", undefined, 404);
  }

  const expense = await db.farmExpense.create({
    data: {
      ...parsed.data,
      expenseDate: parsed.data.expenseDate ? new Date(parsed.data.expenseDate) : new Date(),
      userId: user.id,
    },
  });

  await db.farmActivity.create({
    data: {
      farmId: parsed.data.farmId,
      cropId: parsed.data.cropId ?? null,
      userId: user.id,
      type: "OTHER",
      title: `Expense: ${parsed.data.category} — ₹${parsed.data.amount}`,
      description: parsed.data.description,
      isAuto: true,
    },
  });

  return ok(expense, "Expense logged", 201);
}
