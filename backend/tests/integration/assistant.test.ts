import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Must run before the app (and its environment module) is imported.
vi.hoisted(() => {
  process.env.RAG_ENABLED = "true";
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_EMBEDDING_MODEL = "test-embedding";
  // The test-only provider stub (never used in production) is loaded via sitecustomize.
  process.env.PYTHONPATH = `${process.cwd()}/../rag/tests/stubs`;
});

import { createApp } from "../../src/app.js";
import { Content } from "../../src/models/content.model.js";
import { ContentChunk } from "../../src/models/content-chunk.model.js";
import { ABSTAIN_MESSAGE } from "../../src/services/assistant/assistant.service.js";
import { createItem, signedInClient, type Client } from "../helpers/client.js";
import { startTestDatabase, stopTestDatabase } from "../helpers/database.js";

const app = createApp();
const SOURCE =
  "The project uses blue cards for each source. Every card links back to the original page so readers can verify it.";
let alice: Client;
let bob: Client;
let itemId = "";

beforeAll(async () => {
  expect(path.basename(path.resolve(process.cwd(), "../rag"))).toBe("rag");
  await startTestDatabase();
  alice = await signedInClient(app, "alice");
  bob = await signedInClient(app, "bob");
  itemId = (await createItem(alice, { title: "Design notes", link: "https://design.example/notes" })).id;
});
afterAll(stopTestDatabase);

const index = (client: Client, id: string, body: Record<string, unknown> = { consent: true, text: SOURCE }) =>
  client.put(`/api/v1/assistant/sources/${id}`).send(body);
const ask = (client: Client, question: string) => client.post("/api/v1/assistant/ask").send({ question });

describe("assistant", () => {
  it("reports status", async () => {
    const res = await alice.get("/api/v1/assistant/status");
    expect(res.body.data).toEqual({
      enabled: true,
      indexedSources: 0,
      readySources: 0,
      staleSources: 0,
      sourceLimit: 250,
    });
  });

  it("abstains when nothing is indexed", async () => {
    const res = await ask(alice, "Which cards does the project use?");
    expect(res.body.data).toEqual({ answer: ABSTAIN_MESSAGE, abstained: true, sources: [] });
  });

  it("requires explicit consent before indexing", async () => {
    const res = await index(alice, itemId, { text: SOURCE });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/consent/i);
  });

  it("indexes pasted text into chunks owned by the user", async () => {
    const res = await index(alice, itemId);
    expect(res.status).toBe(200);
    expect(res.body.data.ai).toMatchObject({ sourceType: "pasted", chunkCount: 1, stale: false });
    expect(await ContentChunk.countDocuments({ contentId: itemId })).toBe(1);
    expect((await alice.get("/api/v1/assistant/status")).body.data.readySources).toBe(1);
  });

  it("answers with verbatim, attributed evidence", async () => {
    const res = await ask(alice, "Which cards does the project use?");
    expect(res.status).toBe(200);
    expect(res.body.data.abstained).toBe(false);
    expect(res.body.data.sources).toEqual([
      {
        contentId: itemId,
        title: "Design notes",
        link: "https://design.example/notes",
        quote: "The project uses blue cards for each source.",
        sourceType: "pasted",
        indexedAt: expect.any(String),
      },
    ]);
  });

  it("abstains on irrelevant questions, fabricated quotes and failed support checks", async () => {
    for (const question of [
      "Quantum chromodynamics lattice gauge theory",
      "fabricate details about the project cards",
      "unsupported claim about project cards",
    ]) {
      const res = await ask(alice, question);
      expect(res.body.data.abstained, question).toBe(true);
    }
  });

  it("keeps each user's index private", async () => {
    expect((await index(bob, itemId)).status).toBe(404);
    expect((await bob.delete(`/api/v1/assistant/sources/${itemId}`)).status).toBe(404);
    expect((await ask(bob, "Which cards does the project use?")).body.data.abstained).toBe(true);
  });

  it("replaces chunks on reindex instead of accumulating them", async () => {
    await index(alice, itemId, { consent: true, text: `${SOURCE} A second indexing pass adds this sentence.` });
    const chunks = await ContentChunk.find({ contentId: itemId }).lean();
    const item = await Content.findById(itemId).lean();
    expect(new Set(chunks.map((c) => c.generation))).toEqual(new Set([item!.ai!.generation]));
  });

  it("drops the index when the link changes or the index is removed", async () => {
    await alice.patch(`/api/v1/content/${itemId}`).send({ link: "https://design.example/other" });
    expect((await alice.get(`/api/v1/content/${itemId}`)).body.data.ai).toBeNull();
    expect(await ContentChunk.countDocuments({ contentId: itemId })).toBe(0);

    await index(alice, itemId);
    expect((await alice.delete(`/api/v1/assistant/sources/${itemId}`)).status).toBe(204);
    expect(await ContentChunk.countDocuments({ contentId: itemId })).toBe(0);
    expect((await ask(alice, "Which cards does the project use?")).body.data.abstained).toBe(true);
  });

  it("deletes chunks together with their content", async () => {
    const other = await createItem(alice, { title: "Temporary" });
    await index(alice, other.id);
    expect(await ContentChunk.countDocuments({ contentId: other.id })).toBe(1);
    await alice.delete(`/api/v1/content/${other.id}`);
    expect(await ContentChunk.countDocuments({ contentId: other.id })).toBe(0);
  });

  it("relays unreadable-source errors from the worker", async () => {
    const res = await index(alice, itemId, { consent: true, text: "too short" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("AI_SOURCE_UNREADABLE");
  });
});
