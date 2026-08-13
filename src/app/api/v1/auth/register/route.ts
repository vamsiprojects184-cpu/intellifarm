import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  signAccessToken,
  signRefreshToken,
  setSessionCookies,
} from "@/lib/session";
import { ok, err, validate, safeJson } from "@/lib/api";
import { z } from "zod";

const registerSchema = z.object({
  fullName: z.string().min(2, "Name too short"),
  email: z.string().email("Invalid email"),
  mobile: z.string().min(8, "Invalid mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["FARMER", "EXPERT", "ADMIN"]).default("FARMER"),
  preferredLang: z.string().default("en"),
  state: z.string().optional(),
  district: z.string().optional(),
  village: z.string().optional(),
  farmingExp: z.string().optional(),
  primaryCrop: z.string().optional(),
  farmSizeAcres: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const body = await safeJson(req);
  const parsed = validate(registerSchema, body);
  if (!parsed.ok) return parsed.error;

  const data = parsed.data;
  const existing = await db.user.findFirst({
    where: {
      OR: [{ email: data.email }, { mobile: data.mobile }],
    },
  });
  if (existing) {
    return err("Email or mobile already registered");
  }

  const passwordHash = await hashPassword(data.password);
  const user = await db.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      mobile: data.mobile,
      passwordHash,
      role: data.role,
      preferredLang: data.preferredLang,
      state: data.state,
      district: data.district,
      village: data.village,
      farmingExp: data.farmingExp,
      primaryCrop: data.primaryCrop,
      farmSizeAcres: data.farmSizeAcres,
    },
  });

  // If expert, create a stub profile awaiting verification
  if (user.role === "EXPERT") {
    await db.expertProfile.create({
      data: {
        userId: user.id,
        specialization: data.primaryCrop ?? "General Agriculture",
      },
    });
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
      },
    },
    "Account created successfully",
    201
  );
  await setSessionCookies(res, access, refresh);
  return res;
}
