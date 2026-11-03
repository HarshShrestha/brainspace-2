import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createItem, signedInClient, type Client } from "../helpers/client.js";
import { startTestDatabase, stopTestDatabase } from "../helpers/database.js";

const app = createApp();
let alice: Client;
let bob: Client;

beforeAll(async () => {
  await startTestDatabase();
  alice = await signedInClient(app, "alice");
  bob = await signedInClient(app, "bob");
});
afterAll(stopTestDatabase);

describe("content", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/content");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it.each([
    ["javascript:alert(1)", "script URLs"],
    ["https://user:pass@example.com", "embedded credentials"],
    ["not a url", "non-URLs"],
  ])("rejects %s (%s)", async (link) => {
    const res = await alice.post("/api/v1/content").send({ title: "Bad", link, type: "article" });
    expect(res.status).toBe(400);
  });

  it("creates content with normalized, de-duplicated tags", async () => {
    const item = await createItem(alice, { tags: ["Ideas", "ideas ", "Design"] });
    expect(item).toMatchObject({ title: "A useful article", type: "article", folderId: null, ai: null });
    expect(item.tags).toEqual(["ideas", "design"]);
  });

  it("isolates each user's collection", async () => {
    const mine = await createItem(alice, { title: "Private note" });
    expect((await bob.get("/api/v1/content")).body.data.items).toEqual([]);
    expect((await bob.get(`/api/v1/content/${mine.id}`)).status).toBe(404);
    expect((await bob.patch(`/api/v1/content/${mine.id}`).send({ title: "Hijack" })).status).toBe(404);
    expect((await bob.delete(`/api/v1/content/${mine.id}`)).status).toBe(404);
    expect((await alice.get(`/api/v1/content/${mine.id}`)).body.data.title).toBe("Private note");
  });

  it("rejects malformed identifiers", async () => {
    expect((await alice.get("/api/v1/content/not-an-id")).status).toBe(400);
  });

  it("updates fields partially", async () => {
    const item = await createItem(alice);
    const res = await alice.patch(`/api/v1/content/${item.id}`).send({ title: "Renamed", tags: ["Fresh"] });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: "Renamed", tags: ["fresh"], link: item.link });
    expect((await alice.patch(`/api/v1/content/${item.id}`).send({})).status).toBe(400);
  });

  it("deletes content", async () => {
    const item = await createItem(alice);
    expect((await alice.delete(`/api/v1/content/${item.id}`)).status).toBe(204);
    expect((await alice.get(`/api/v1/content/${item.id}`)).status).toBe(404);
  });
});

describe("listing, search and pagination", () => {
  let carol: Client;
  beforeAll(async () => {
    carol = await signedInClient(app, "carol");
    await createItem(carol, { title: "Rust ownership", link: "https://rust.example/own", tags: ["rust"] });
    await createItem(carol, { title: "Jazz history", type: "audio", link: "https://music.example/jazz" });
    await createItem(carol, { title: "Borrow checker", link: "https://blog.example/b", tags: ["rust", "compilers"] });
    await createItem(carol, { title: "Cat photo", type: "image", link: "https://img.example/cat" });
    await createItem(carol, { title: "Regex (a+)+ trap", link: "https://re.example/x" });
  });

  const titles = async (query: string) =>
    ((await carol.get(`/api/v1/content${query}`)).body.data.items as { title: string }[]).map((i) => i.title);

  it("returns newest first", async () => {
    expect(await titles("")).toEqual([
      "Regex (a+)+ trap",
      "Cat photo",
      "Borrow checker",
      "Jazz history",
      "Rust ownership",
    ]);
  });

  it("filters by type, tag and text (title, link or tag)", async () => {
    expect(await titles("?type=audio")).toEqual(["Jazz history"]);
    expect(await titles("?tag=Rust")).toEqual(["Borrow checker", "Rust ownership"]);
    expect(await titles("?tag=unknown")).toEqual([]);
    expect(await titles("?q=compil")).toEqual(["Borrow checker"]);
    expect(await titles("?q=music.example")).toEqual(["Jazz history"]);
    expect(await titles(`?q=${encodeURIComponent("(a+)+")}`)).toEqual(["Regex (a+)+ trap"]);
  });

  it("paginates with a stable cursor", async () => {
    const first = (await carol.get("/api/v1/content?limit=2")).body.data;
    expect(first.items).toHaveLength(2);
    const second = (await carol.get(`/api/v1/content?limit=2&cursor=${first.nextCursor}`)).body.data;
    const third = (await carol.get(`/api/v1/content?limit=2&cursor=${second.nextCursor}`)).body.data;
    expect(third.nextCursor).toBeNull();
    const all = [...first.items, ...second.items, ...third.items].map((i: { title: string }) => i.title);
    expect(all).toEqual(await titles(""));
    expect((await carol.get("/api/v1/content?cursor=bogus")).status).toBe(400);
    expect((await carol.get("/api/v1/content?limit=1000")).status).toBe(400);
  });

  it("lists tags in use with counts", async () => {
    const res = await carol.get("/api/v1/tags");
    expect(res.body.data).toEqual([
      { title: "rust", count: 2 },
      { title: "compilers", count: 1 },
    ]);
  });
});

describe("folders", () => {
  it("creates folders with case-insensitive unique names", async () => {
    const res = await alice.post("/api/v1/folders").send({ name: "Research" });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: "Research", itemCount: 0 });
    expect((await alice.post("/api/v1/folders").send({ name: "research" })).status).toBe(409);
    // Another user may use the same name.
    expect((await bob.post("/api/v1/folders").send({ name: "Research" })).status).toBe(201);
  });

  it("moves items between owned folders and reports counts", async () => {
    const folder = (await alice.post("/api/v1/folders").send({ name: "Reading" })).body.data;
    const item = await createItem(alice, { folderId: folder.id });
    expect(item.folderId).toBe(folder.id);

    const inFolder = (await alice.get(`/api/v1/content?folder=${folder.id}`)).body.data.items;
    expect(inFolder.map((i: { id: string }) => i.id)).toEqual([item.id]);
    const listed = (await alice.get("/api/v1/folders")).body.data.find((f: { id: string }) => f.id === folder.id);
    expect(listed.itemCount).toBe(1);

    const moved = await alice.patch(`/api/v1/content/${item.id}`).send({ folderId: null });
    expect(moved.body.data.folderId).toBeNull();
    const root = (await alice.get("/api/v1/content?folder=root")).body.data.items;
    expect(root.some((i: { id: string }) => i.id === item.id)).toBe(true);
  });

  it("never lets a user file items into someone else's folder", async () => {
    const bobsFolder = (await bob.post("/api/v1/folders").send({ name: "Bob only" })).body.data;
    const item = await createItem(alice);
    expect((await alice.patch(`/api/v1/content/${item.id}`).send({ folderId: bobsFolder.id })).status).toBe(404);
    expect((await alice.post("/api/v1/content").send({ ...item, folderId: bobsFolder.id })).status).toBe(404);
    expect((await alice.delete(`/api/v1/folders/${bobsFolder.id}`)).status).toBe(404);
  });

  it("renames folders, rejecting duplicates", async () => {
    const folder = (await alice.post("/api/v1/folders").send({ name: "Temp" })).body.data;
    expect((await alice.patch(`/api/v1/folders/${folder.id}`).send({ name: "Archive" })).body.data.name).toBe(
      "Archive",
    );
    expect((await alice.patch(`/api/v1/folders/${folder.id}`).send({ name: "RESEARCH" })).status).toBe(409);
  });

  it("only deletes empty folders", async () => {
    const folder = (await alice.post("/api/v1/folders").send({ name: "Full" })).body.data;
    const item = await createItem(alice, { folderId: folder.id });
    const blocked = await alice.delete(`/api/v1/folders/${folder.id}`);
    expect(blocked.status).toBe(409);
    await alice.patch(`/api/v1/content/${item.id}`).send({ folderId: null });
    expect((await alice.delete(`/api/v1/folders/${folder.id}`)).status).toBe(204);
  });
});
