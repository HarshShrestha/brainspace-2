import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError, setUnauthorizedHandler, withQuery } from "./apiClient";

const respond = (status: number, body?: unknown) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => setUnauthorizedHandler(() => {}));

describe("apiClient", () => {
  it("unwraps the success envelope and sends cookies", async () => {
    const fetch = respond(200, { success: true, data: { id: 1 } });
    await expect(apiClient.get("/content")).resolves.toEqual({ id: 1 });
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/content",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
  });

  it("serializes JSON bodies", async () => {
    const fetch = respond(201, { success: true, data: null });
    await apiClient.post("/folders", { name: "A" });
    const init = fetch.mock.calls[0]![1]!;
    expect(init.body).toBe('{"name":"A"}');
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("returns undefined for 204 responses", async () => {
    respond(204);
    await expect(apiClient.delete("/content/1")).resolves.toBeUndefined();
  });

  it("maps error envelopes to ApiError with code and details", async () => {
    respond(400, {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Bad", details: [{ path: "title", message: "Required" }] },
    });
    const error = await apiClient.post("/content", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Bad",
      details: [{ path: "title" }],
    });
  });

  it("reports network failures with status 0", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiClient.get("/content")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("signals an ended session on 401, but not for wrong credentials", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    respond(401, { success: false, error: { code: "INVALID_CREDENTIALS", message: "Nope" } });
    await expect(apiClient.post("/auth/login", {})).rejects.toThrow("Nope");
    expect(handler).not.toHaveBeenCalled();
    respond(401, { success: false, error: { code: "UNAUTHENTICATED", message: "Sign in" } });
    await expect(apiClient.get("/content")).rejects.toThrow("Sign in");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("builds query strings without empty values", () => {
    expect(withQuery("/content", { q: "a b", type: undefined, tag: "", limit: 24 })).toBe("/content?q=a+b&limit=24");
    expect(withQuery("/content")).toBe("/content");
  });
});
