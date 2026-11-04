/**
 * Runs before each test file is imported (vitest `setupFiles`), so `src/config/environment.ts`
 * validates this deterministic test configuration. Never point tests at a real database.
 */
process.env.NODE_ENV = "test";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/unused-by-tests";
process.env.JWT_SECRET = "test-only-secret-that-is-at-least-32-characters-long";
process.env.BCRYPT_ROUNDS = "4";
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.RAG_ENABLED ??= "false";
