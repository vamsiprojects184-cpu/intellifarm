import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, forbidden, notFound, validate, safeJson } from "@/lib/api";
import { z } from "zod";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  action: z.enum(["ACTIVATE", "DEACTIVATE", "VERIFY", "UNVERIFY", "RESET_PASSWORD", "DELETE"]),
  password: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return forbidden("Admin access required");
  const { id } = await params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return notFound("User not found");

  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;

  let update: Record<string, unknown> = {};
  switch (parsed.data.action) {
    case "ACTIVATE":
      update.isActive = true;
      break;
    case "DEACTIVATE":
      update.isActive = false;
      break;
    case "VERIFY":
      update.isVerified = true;
      break;
    case "UNVERIFY":
      update.isVerified = false;
      break;
    case "RESET_PASSWORD":
      if (!parsed.data.password || parsed.data.password.length < 6)
        return notFound("Password must be at least 6 chars");
      update.passwordHash = await hashPassword(parsed.data.password);
      break;
    case "DELETE":
      await db.user.delete({ where: { id } });
      await db.auditLog.create({
        data: {
          userId: admin.id,
          action: "DELETE_USER",
          entity: "User",
          entityId: id,
          detail: `Deleted user ${target.email}`,
        },
      });
      return ok(null, "User deleted");
  }

  const updated = await db.user.update({ where: { id }, data: update });
  await db.auditLog.create({
    data: {
      userId: admin.id,
      action: parsed.data.action,
      entity: "User",
      entityId: id,
      detail: `${parsed.data.action} on ${target.email}`,
    },
  });
  return ok(updated, `User ${parsed.data.action.toLowerCase()}`);
}
