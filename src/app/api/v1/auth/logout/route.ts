import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clearSessionCookies } from "@/lib/session";
import { ok } from "@/lib/api";
import { cookies } from "next/headers";

export async function POST() {
  const store = await cookies();
  const refresh = store.get("ec_refresh")?.value;
  if (refresh) {
    await db.refreshToken.updateMany({
      where: { token: refresh },
      data: { revoked: true },
    });
  }
  const res = ok(null, "Logged out successfully");
  await clearSessionCookies(res);
  return res;
}

export async function GET() {
  // allow GET logout for convenience
  return POST();
}

// Keep NextResponse import used
export const _ = NextResponse;
