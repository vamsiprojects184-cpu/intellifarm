import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  signAccessToken,
  signRefreshToken,
  setSessionCookies,
} from "@/lib/session";
import { ok, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  const parsed = validate(loginSchema, body);
  if (!parsed.ok) return parsed.error;

  const data = parsed.data;
  const user = await db.user.findUnique({
    where: { email: data.email },
    include: { expertProfile: true },
  });
  if (!user) {
    return err("Invalid email or password", undefined, 401);
  }
  if (!user.isActive) {
    return err("Account is disabled. Contact support.", undefined, 403);
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    return err("Invalid email or password", undefined, 401);
  }

  const access = await signAccessToken({
    uid: user.id,
    role: user.role,
    email: user.email,
  });
  const { token: refresh } = await signRefreshToken(user.id);

  const res = ok(
    {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        expertProfile: user.expertProfile
          ? {
              id: user.expertProfile.id,
              isVerified: user.expertProfile.isVerified,
              specialization: user.expertProfile.specialization,
            }
          : null,
      },
    },
    "Login successful"
  );
  await setSessionCookies(res, access, refresh);
  return res;
}
