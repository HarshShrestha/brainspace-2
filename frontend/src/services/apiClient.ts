import type { ApiErrorBody, ApiSuccess } from "@/types/api.types";

/** A failed API call. `code` is the stable machine-readable error code; `status` 0 means no response. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE_URL = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");

/** Endpoints where 401 means "wrong credentials", not "your session ended". */
const CREDENTIAL_PATHS = new Set(["/auth/login", "/auth/register", "/account/password", "/account"]);

let onUnauthorized: () => void = () => {};

/** Registers the callback invoked when an authenticated request reports an ended session. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | undefined | null>;

export function withQuery(path: string, query: Query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers:
        body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Couldn't reach BrainSpace. Check your connection and try again.", 0, "NETWORK_ERROR");
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiErrorBody | null;

  if (!response.ok || !payload || payload.success !== true) {
    if (response.status === 401 && !CREDENTIAL_PATHS.has(path)) onUnauthorized();
    const error = payload && payload.success === false ? payload.error : undefined;
    throw new ApiError(
      error?.message ?? "Something went wrong. Please try again.",
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.details,
    );
  }
  return payload.data;
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>("GET", path, undefined, signal),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T = void>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};
