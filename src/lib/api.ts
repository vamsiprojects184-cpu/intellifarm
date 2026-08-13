import { NextResponse } from "next/server";
import { z } from "zod";

export function ok<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    { success: true, message: message ?? "OK", data },
    { status }
  );
}

export function err(message: string, errors?: unknown, status = 400) {
  return NextResponse.json(
    { success: false, message, errors: errors ?? [] },
    { status }
  );
}

export function unauthorized(message = "Unauthorized") {
  return err(message, undefined, 401);
}

export function forbidden(message = "Forbidden") {
  return err(message, undefined, 403);
}

export function notFound(message = "Not found") {
  return err(message, undefined, 404);
}

export function validate<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { ok: true; data: T } | { ok: false; error: ReturnType<typeof err> } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      error: err(
        "Validation failed",
        parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }))
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export function safeJson(req: Request): Promise<unknown> {
  return req.json().catch(() => ({}));
}
