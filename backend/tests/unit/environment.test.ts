import { describe, expect, it } from "vitest";
import { loadEnvironment } from "../../src/config/environment.js";

const base = { MONGODB_URI: "mongodb://localhost/db", JWT_SECRET: "x".repeat(32) };

describe("loadEnvironment", () => {
  it("applies safe defaults", () => {
    const env = loadEnvironment(base);
    expect(env.port).toBe(8000);
    expect(env.rag.enabled).toBe(false);
    expect(env.corsOrigins).toEqual(["http://localhost:5173"]);
    expect(env.auth.bcryptRounds).toBe(12);
  });

  it("parses origin lists", () => {
    const env = loadEnvironment({ ...base, CORS_ORIGINS: "https://a.example.com, https://b.example.com" });
    expect(env.corsOrigins).toEqual(["https://a.example.com", "https://b.example.com"]);
  });

  it("reports every problem at once", () => {
    expect(() => loadEnvironment({ JWT_SECRET: "short" })).toThrow(/MONGODB_URI[\s\S]*JWT_SECRET/);
  });

  it.each([
    [{ CORS_ORIGINS: "https://app.example.com/" }, /CORS_ORIGINS/],
    [{ NODE_ENV: "production" }, /CORS_ORIGINS: is required in production/],
    [{ NODE_ENV: "production", CORS_ORIGINS: "https://a.example.com", BCRYPT_ROUNDS: "4" }, /BCRYPT_ROUNDS/],
    [{ RAG_ENABLED: "true" }, /GEMINI_API_KEY/],
    [{ GEMINI_CHAT_MODEL: "../../etc" }, /GEMINI_CHAT_MODEL/],
    [{ TRUST_PROXY_HOPS: "50" }, /TRUST_PROXY_HOPS/],
  ])("rejects unsafe configuration %j", (overrides, message) => {
    expect(() => loadEnvironment({ ...base, ...overrides })).toThrow(message);
  });
});
