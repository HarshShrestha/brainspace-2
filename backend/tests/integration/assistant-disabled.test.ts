import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createItem, signedInClient, type Client } from "../helpers/client.js";
import { startTestDatabase, stopTestDatabase } from "../helpers/database.js";

// Default test environment: RAG_ENABLED=false.
const app = createApp();
let alice: Client;

beforeAll(async () => {
  await startTestDatabase();
  alice = await signedInClient(app, "alice");
});
afterAll(stopTestDatabase);

describe("assistant when disabled", () => {
  it("reports that it is disabled and refuses AI work without calling a provider", async () => {
    expect((await alice.get("/api/v1/assistant/status")).body.data.enabled).toBe(false);
    const item = await createItem(alice);
    const indexed = await alice
      .put(`/api/v1/assistant/sources/${item.id}`)
      .send({ consent: true, text: "x".repeat(100) });
    expect(indexed.status).toBe(503);
    expect(indexed.body.error.code).toBe("AI_NOT_CONFIGURED");
    expect((await alice.post("/api/v1/assistant/ask").send({ question: "Anything?" })).status).toBe(503);
  });
});
