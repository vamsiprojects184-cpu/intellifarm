import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * Eco Crop uses a lightweight signed-JWT-style session token stored in an
 * httpOnly cookie. To keep the dependency surface small we implement a simple
 * HMAC-signed token (header.payload.signature) instead of pulling in jsonwebtoken.
 * The token payload contains the userId, role and an expiry.
 */

const SECRET =
  process.env.ECOCROP_SECRET ||
  "ecocrop-dev-secret-change-me-please-0123456789";

const ACCESS_TTL = 60 * 60 * 1000; // 1 hour
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const ACCESS_COOKIE = "ec_session";
const REFRESH_COOKIE = "ec_refresh";

export interface SessionPayload {
  uid: string;
  role: string;
  email: string;
  exp: number;
}

function b64urlEncode(obj: unknown): string {
  const json = typeof obj === "string" ? obj : JSON.stringify(obj);
  return Buffer.from(json, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64").toString("utf-8");
}

async function hmac(data: string): Promise<string> {
  const { createHmac } = await import("crypto");
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

export async function signAccessToken(payload: Omit<SessionPayload, "exp">) {
  const exp = Date.now() + ACCESS_TTL;
  const body: SessionPayload = { ...payload, exp };
  const header = b64urlEncode({ alg: "HS256", typ: "JWT" });
  const payloadB64 = b64urlEncode(body);
  const sig = await hmac(`${header}.${payloadB64}`);
  return `${header}.${payloadB64}.${sig}`;
}

export async function signRefreshToken(uid: string) {
  // random token + db record
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TTL);
  await db.refreshToken.create({
    data: { token, userId: uid, expiresAt },
  });
  return { token, expiresAt };
}

export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const [header, payloadB64, sig] = token.split(".");
    if (!header || !payloadB64 || !sig) return null;
    const expected = await hmac(`${header}.${payloadB64}`);
    if (sig !== expected) return null;
    const payload = JSON.parse(b64urlDecode(payloadB64)) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (payload) return payload;
  // try refresh
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const rt = await db.refreshToken.findUnique({
    where: { token: refresh },
    include: { user: true },
  });
  if (!rt || rt.revoked || rt.expiresAt < new Date()) return null;
  const user = rt.user;
  if (!user.isActive) return null;
  return { uid: user.id, role: user.role, email: user.email, exp: Date.now() + ACCESS_TTL };
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { expertProfile: true },
  });
  return user;
}

export async function setSessionCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
) {
  res.headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ACCESS_TTL / 1000}`
  );
  res.headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${REFRESH_TTL / 1000}`
  );
}

export async function clearSessionCookies(res: Response) {
  res.headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  res.headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export const ACCESS_COOKIE_NAME = ACCESS_COOKIE;
export const REFRESH_COOKIE_NAME = REFRESH_COOKIE;
export { ACCESS_TTL, REFRESH_TTL };
