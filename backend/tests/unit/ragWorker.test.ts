import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRagWorker } from "../../src/services/assistant/ragWorker.js";
import { ApiError } from "../../src/utils/ApiError.js";

/** A throwaway `brainspace_rag.worker` whose behaviour is chosen by the requested operation. */
const FAKE_WORKER = `
import json, os, sys, time
request = json.load(sys.stdin)
op = request["operation"]
if op == "index":
    print(json.dumps({"ok": True, "data": {"echo": request["payload"], "secret": os.environ.get("JWT_SECRET")}}))
elif op == "embed_query":
    print("this is not json")
elif op == "answer":
    if request["payload"].get("slow"):
        time.sleep(30)
    print(json.dumps({"ok": False, "status": 422, "message": "Source unreadable"}))
`;

let dir = "";
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "rag-worker-"));
  mkdirSync(path.join(dir, "brainspace_rag"));
  writeFileSync(path.join(dir, "brainspace_rag", "__init__.py"), "");
  writeFileSync(path.join(dir, "brainspace_rag", "worker.py"), FAKE_WORKER);
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const worker = (overrides: Partial<Parameters<typeof createRagWorker>[0]> = {}) =>
  createRagWorker({
    python: "python3",
    workerDir: dir,
    timeoutMs: 10_000,
    maxConcurrency: 2,
    env: { PATH: process.env.PATH ?? "" },
    ...overrides,
  });

describe("RAG worker client", () => {
  it("round-trips JSON and does not inherit the API's environment", async () => {
    process.env.JWT_SECRET ??= "set-in-parent";
    const result = await worker().run<{ echo: unknown; secret: unknown }>("index", { a: 1 });
    expect(result).toEqual({ echo: { a: 1 }, secret: null });
  });

  it("relays user-safe worker errors with a mapped code", async () => {
    const error = await worker()
      .run("answer", {})
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ statusCode: 422, code: "AI_SOURCE_UNREADABLE", message: "Source unreadable" });
  });

  it("rejects invalid output", async () => {
    await expect(worker().run("embed_query", {})).rejects.toMatchObject({ statusCode: 502 });
  });

  it("kills a worker that exceeds its deadline", async () => {
    await expect(worker({ timeoutMs: 500 }).run("answer", { slow: true })).rejects.toMatchObject({ statusCode: 504 });
  });

  it("reports a missing Python executable as unavailable", async () => {
    await expect(worker({ python: "definitely-not-python" }).run("index", {})).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it("serves more calls than its concurrency limit", async () => {
    const pool = worker({ maxConcurrency: 1 });
    const results = await Promise.all([1, 2, 3].map((n) => pool.run<{ echo: { n: number } }>("index", { n })));
    expect(results.map((r) => r.echo.n)).toEqual([1, 2, 3]);
  });
});
