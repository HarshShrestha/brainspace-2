import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests against the built API and the built frontend (`vite preview`), on one origin.
 * Requires E2E_MONGODB_URI pointing at a disposable MongoDB; the database is created per run.
 * The AI assistant runs the real Python worker with the test-only provider stub (no network, no cost).
 */
const mongo = process.env.E2E_MONGODB_URI;
if (!mongo) throw new Error("Set E2E_MONGODB_URI to a disposable MongoDB (e.g. mongodb://127.0.0.1:27017).");

const root = path.resolve(import.meta.dirname, "..");
const API_PORT = 8800;
const WEB_PORT = 4300;
const WEB = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: WEB, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node dist/server.js",
      cwd: path.join(root, "backend"),
      url: `http://127.0.0.1:${API_PORT}/api/v1/health/ready`,
      reuseExistingServer: false,
      env: {
        NODE_ENV: "development",
        PORT: String(API_PORT),
        LOG_LEVEL: "warn",
        MONGODB_URI: `${mongo.replace(/\/$/, "")}/brainspace_e2e_${Date.now()}`,
        JWT_SECRET: "e2e-only-secret-that-is-at-least-32-characters",
        CORS_ORIGINS: WEB,
        RAG_ENABLED: "true",
        GEMINI_API_KEY: "e2e-stub-key",
        PYTHONPATH: path.join(root, "rag/tests/stubs"),
      },
    },
    {
      command: `npx vite preview --port ${WEB_PORT} --strictPort`,
      cwd: path.join(root, "frontend"),
      url: WEB,
      reuseExistingServer: false,
      env: { VITE_DEV_API_PROXY: `http://127.0.0.1:${API_PORT}` },
    },
  ],
});
