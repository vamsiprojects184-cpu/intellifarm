import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, validate, safeJson, err } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(2).optional(),
  mobile: z.string().min(8).optional(),
  preferredLang: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  village: z.string().optional(),
  farmingExp: z.string().optional(),
  primaryCrop: z.string().optional(),
  farmSizeAcres: z.number().optional(),
  avatarUrl: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await safeJson(req);
  const parsed = validate(schema, body);
  if (!parsed.ok) return parsed.error;

  // uniqueness check for mobile
  if (parsed.data.mobile && parsed.data.mobile !== user.mobile) {
    const exists = await db.user.findUnique({ where: { mobile: parsed.data.mobile } });
    if (exists) return err("Mobile number already in use");
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: parsed.data,
  });
  return ok(
    { id: updated.id, fullName: updated.fullName, email: updated.email, mobile: updated.mobile, role: updated.role },
    "Profile updated"
  );
}
