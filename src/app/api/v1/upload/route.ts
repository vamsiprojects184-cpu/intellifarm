import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { ok, unauthorized, err } from "@/lib/api";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "upload", "disease");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return err("No file uploaded");
  }
  if (file.size > MAX_SIZE) {
    return err("File too large. Max 5MB.");
  }
  if (!ALLOWED.includes(file.type)) {
    return err("Only JPEG, PNG, and WebP images are allowed");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return ok(
    { url: `/upload/disease/${name}`, filename: file.name, size: file.size },
    "File uploaded",
    201
  );
}
