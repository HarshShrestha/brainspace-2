import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { ShareLink } from "../../src/models/share-link.model.js";
import { createItem, signedInClient, type Client } from "../helpers/client.js";
import { startTestDatabase, stopTestDatabase } from "../helpers/database.js";

const app = createApp();
let alice: Client;
let bob: Client;

beforeAll(async () => {
  await startTestDatabase();
  alice = await signedInClient(app, "alice");
  bob = await signedInClient(app, "bob");
  const folder = (await alice.post("/api/v1/folders").send({ name: "Private folder" })).body.data;
  await createItem(alice, { title: "Shared idea", tags: ["public"], folderId: folder.id });
});
afterAll(stopTestDatabase);

const rotate = async (client: Client) => (await client.post("/api/v1/share-link")).body.data.token as string;
const viewPublic = (token: string) => request(app).get(`/api/v1/shared/${token}`);

describe("public share links", () => {
  it("starts inactive", async () => {
    expect((await alice.get("/api/v1/share-link")).body.data).toEqual({ active: false, createdAt: null });
  });

  it("exposes a read-only view without private metadata, storing only a digest", async () => {
    const token = await rotate(alice);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await ShareLink.exists({ tokenHash: token })).toBeNull();

    const res = await viewPublic(token);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body.data.owner).toEqual({ username: "alice" });
    expect(res.body.data.items).toHaveLength(1);
    expect(Object.keys(res.body.data.items[0]).sort()).toEqual(["createdAt", "id", "link", "tags", "title", "type"]);
    expect((await alice.get("/api/v1/share-link")).body.data.active).toBe(true);
  });

  it("invalidates the previous token on rotation and stops on revocation", async () => {
    const first = await rotate(alice);
    const second = await rotate(alice);
    expect((await viewPublic(first)).status).toBe(404);
    expect((await viewPublic(second)).status).toBe(200);

    expect((await alice.delete("/api/v1/share-link")).status).toBe(204);
    expect((await viewPublic(second)).status).toBe(404);
    expect((await alice.delete("/api/v1/share-link")).status).toBe(404);
  });

  it("answers malformed and unknown tokens identically", async () => {
    const malformed = await viewPublic("short");
    const unknown = await viewPublic("A".repeat(43));
    expect(malformed.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(malformed.body.error.message).toBe(unknown.body.error.message);
  });
});

describe("shared with me", () => {
  it("saves a pasted link idempotently and refuses the owner's own link", async () => {
    const token = await rotate(alice);
    const link = `http://localhost:5173/shared/${token}`;
    const saved = await bob.post("/api/v1/received-shares").send({ link });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({ ownerUsername: "alice", available: true });
    const again = await bob.post("/api/v1/received-shares").send({ link });
    expect(again.body.data.id).toBe(saved.body.data.id);
    expect((await bob.get("/api/v1/received-shares")).body.data).toHaveLength(1);

    expect((await alice.post("/api/v1/received-shares").send({ link })).status).toBe(400);
    expect((await bob.post("/api/v1/received-shares").send({ link: "https://x.example/nope" })).status).toBe(400);
    expect(
      (await bob.post("/api/v1/received-shares").send({ link: `http://localhost/shared/${"B".repeat(43)}` })).status,
    ).toBe(404);
  });

  it("opens the space read-only, and reflects revocation", async () => {
    const [entry] = (await bob.get("/api/v1/received-shares")).body.data;
    const view = await bob.get(`/api/v1/received-shares/${entry.id}`);
    expect(view.body.data.items[0].title).toBe("Shared idea");
    // Another user cannot open Bob's saved entry.
    expect((await alice.get(`/api/v1/received-shares/${entry.id}`)).status).toBe(404);

    await alice.delete("/api/v1/share-link");
    const [after] = (await bob.get("/api/v1/received-shares")).body.data;
    expect(after).toMatchObject({ id: entry.id, available: false, ownerUsername: null });
    expect((await bob.get(`/api/v1/received-shares/${entry.id}`)).status).toBe(404);

    expect((await bob.delete(`/api/v1/received-shares/${entry.id}`)).status).toBe(204);
    expect((await bob.get("/api/v1/received-shares")).body.data).toEqual([]);
  });
});
