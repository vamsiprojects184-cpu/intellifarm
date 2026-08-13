import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, notFound } from "@/lib/api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const expense = await db.farmExpense.findUnique({ where: { id } });
  if (!expense || expense.userId !== user.id) return notFound("Expense not found");
  await db.farmExpense.delete({ where: { id } });
  return ok(null, "Expense deleted");
}
