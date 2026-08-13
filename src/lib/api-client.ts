/** Lightweight fetch wrapper that always uses relative paths and handles
 *  the Eco Crop unified response envelope `{ success, message, data }`. */

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { formData?: FormData; headers?: Record<string, string> }
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: opts?.formData
      ? undefined
      : { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    body: opts?.formData
      ? opts.formData
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
    cache: "no-store",
  });
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  if (!res.ok || !json.success) {
    const msg =
      json.message ||
      (typeof json.errors === "string" ? json.errors : "Request failed");
    const e = new Error(msg) as Error & { status?: number; errors?: unknown };
    e.status = res.status;
    e.errors = json.errors;
    throw e;
  }
  return json.data;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  upload: <T>(path: string, formData: FormData) =>
    request<T>("POST", path, undefined, { formData }),
};
