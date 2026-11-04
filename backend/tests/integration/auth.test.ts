import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { Content } from "../../src/models/content.model.js";
import { User } from "../../src/models/user.model.js";
import { createItem, PASSWORD, sessionTokenFrom, signedInClient } from "../helpers/client.js";
import { startTestDatabase, stopTestDatabase } from "../helpers/database.js";

const app = createApp();
beforeAll(startTestDatabase);
afterAll(stopTestDatabase);

describe("registration", () => {
  it("validates input with field-level details", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ username: "!", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(["username", "password"]);
  });

  it("creates the account, sets a hardened session cookie and never returns secrets", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ username: "Alice", password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ id: expect.any(String), username: "alice", createdAt: expect.any(String) });
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/bs_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(res.headers["cache-control"]).toBe("no-store");
    const stored = await User.findOne({ username: "alice" }).select("+passwordHash").lean();
    expect(stored?.passwordHash).not.toContain(PASSWORD);
  });

  it("treats usernames case-insensitively", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ username: "ALICE", password: PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});

describe("sessions", () => {
  it("signs in with the cookie and rejects wrong passwords uniformly", async () => {
    const ok = request.agent(app);
    expect((await ok.post("/api/v1/auth/login").send({ username: "alice", password: PASSWORD })).status).toBe(200);
    expect((await ok.get("/api/v1/auth/session")).body.data.username).toBe("alice");

    const wrong = await request(app).post("/api/v1/auth/login").send({ username: "alice", password: "nope-nope" });
    const missing = await request(app).post("/api/v1/auth/login").send({ username: "nobody", password: "nope-nope" });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    // Same code and message whether or not the username exists (no account enumeration).
    expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(missing.body.error.code).toBe(wrong.body.error.code);
    expect(missing.body.error.message).toBe(wrong.body.error.message);
  });

  it("accepts a bearer token for non-browser clients and rejects tampered tokens", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ username: "alice", password: PASSWORD });
    const token = sessionTokenFrom(login);
    expect((await request(app).get("/api/v1/auth/session").set("Authorization", `Bearer ${token}`)).status).toBe(200);
    const tampered = `${token.slice(0, -2)}xx`;
    const res = await request(app).get("/api/v1/auth/session").set("Authorization", `Bearer ${tampered}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("logout revokes every session, and works even with a stale cookie", async () => {
    const first = await request(app).post("/api/v1/auth/login").send({ username: "alice", password: PASSWORD });
    const second = await request(app).post("/api/v1/auth/login").send({ username: "alice", password: PASSWORD });
    const [a, b] = [sessionTokenFrom(first), sessionTokenFrom(second)];
    const out = await request(app).post("/api/v1/auth/logout").set("Authorization", `Bearer ${a}`);
    expect(out.status).toBe(204);
    expect(String(out.headers["set-cookie"])).toMatch(/bs_session=;/);
    expect((await request(app).get("/api/v1/auth/session").set("Authorization", `Bearer ${b}`)).status).toBe(401);
    expect((await request(app).post("/api/v1/auth/logout").set("Authorization", `Bearer ${a}`)).status).toBe(204);
  });
});

describe("account management", () => {
  it("changes the password, keeps the current device signed in and revokes others", async () => {
    const device = await signedInClient(app, "carol");
    const other = sessionTokenFrom(
      await request(app).post("/api/v1/auth/login").send({ username: "carol", password: PASSWORD }),
    );

    const wrong = await device
      .patch("/api/v1/account/password")
      .send({ currentPassword: "wrong-password", newPassword: "a brand new password" });
    expect(wrong.status).toBe(401);

    const res = await device
      .patch("/api/v1/account/password")
      .send({ currentPassword: PASSWORD, newPassword: "a brand new password" });
    expect(res.status).toBe(204);
    expect((await device.get("/api/v1/auth/session")).status).toBe(200);
    expect((await request(app).get("/api/v1/auth/session").set("Authorization", `Bearer ${other}`)).status).toBe(401);
    const relogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "carol", password: "a brand new password" });
    expect(relogin.status).toBe(200);
  });

  it("deletes the account and all of its data after confirming the password", async () => {
    const dave = await signedInClient(app, "dave");
    await createItem(dave, { tags: ["x"] });
    const { body } = await dave.get("/api/v1/auth/session");

    expect((await dave.delete("/api/v1/account").send({ password: "wrong" })).status).toBe(401);
    expect((await dave.delete("/api/v1/account").send({ password: PASSWORD })).status).toBe(204);
    expect(await User.exists({ _id: body.data.id })).toBeNull();
    expect(await Content.countDocuments({ userId: body.data.id })).toBe(0);
    expect((await dave.get("/api/v1/auth/session")).status).toBe(401);
  });
});

describe("transport security", () => {
  it("rejects state-changing requests from disallowed origins", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "https://evil.example.com")
      .send({ username: "alice", password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
    const allowed = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:5173")
      .send({ username: "alice", password: PASSWORD });
    expect(allowed.status).toBe(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("returns consistent envelopes for malformed JSON and unknown routes", async () => {
    const bad = await request(app).post("/api/v1/auth/login").set("Content-Type", "application/json").send("{oops");
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_JSON");
    const missing = await request(app).get("/api/v1/nope");
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
  });

  it("sets security headers and a request ID", async () => {
    const res = await request(app).get("/api/v1/health/live");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-request-id"]).toMatch(/^[\w-]+$/);
  });

  it("reports liveness and readiness", async () => {
    expect((await request(app).get("/api/v1/health/live")).body.data.status).toBe("ok");
    expect((await request(app).get("/api/v1/health/ready")).body.data.status).toBe("ready");
  });
});
