import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

/** Directory that contains package.json, both from `src/` (tsx) and `dist/` (compiled). */
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const modelName = z.string().regex(/^[A-Za-z0-9._-]+$/, "must contain only letters, digits, '.', '_' or '-'");

const originList = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(
    z
      .array(
        z.string().refine((origin) => {
          try {
            return new URL(origin).origin === origin;
          } catch {
            return false;
          }
        }, "each origin must look like https://app.example.com (no path or trailing slash)"),
      )
      .min(1),
  );

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    MONGODB_URI: z.string().min(1, "is required"),
    JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    CORS_ORIGINS: originList.optional(),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(1).max(10).optional(),
    RAG_ENABLED: booleanString,
    GEMINI_API_KEY: z.string().trim().optional(),
    GEMINI_EMBEDDING_MODEL: modelName.default("gemini-embedding-001"),
    GEMINI_CHAT_MODEL: modelName.default("gemini-3.8-flash"),
    RAG_PYTHON: z.string().min(1).default("python3"),
    RAG_WORKER_DIR: z.string().min(1).optional(),
    RAG_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(600_000).default(120_000),
    RAG_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production") {
      if (!value.CORS_ORIGINS)
        ctx.addIssue({ code: "custom", path: ["CORS_ORIGINS"], message: "is required in production" });
      if (value.BCRYPT_ROUNDS < 10)
        ctx.addIssue({ code: "custom", path: ["BCRYPT_ROUNDS"], message: "must be at least 10 in production" });
    }
    if (value.RAG_ENABLED && !value.GEMINI_API_KEY)
      ctx.addIssue({ code: "custom", path: ["GEMINI_API_KEY"], message: "is required when RAG_ENABLED=true" });
  });

export type Environment = ReturnType<typeof loadEnvironment>;

/** Parses and validates configuration; throws one readable error listing every problem. */
export function loadEnvironment(source: NodeJS.ProcessEnv) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join("\n")}`);
  }
  const v = result.data;
  return {
    nodeEnv: v.NODE_ENV,
    isProduction: v.NODE_ENV === "production",
    port: v.PORT,
    logLevel: v.LOG_LEVEL,
    mongodbUri: v.MONGODB_URI,
    auth: {
      jwtSecret: v.JWT_SECRET,
      sessionTtlDays: v.SESSION_TTL_DAYS,
      bcryptRounds: v.BCRYPT_ROUNDS,
    },
    corsOrigins: v.CORS_ORIGINS ?? ["http://localhost:5173"],
    trustProxyHops: v.TRUST_PROXY_HOPS,
    rag: {
      enabled: v.RAG_ENABLED,
      geminiApiKey: v.GEMINI_API_KEY ?? "",
      embeddingModel: v.GEMINI_EMBEDDING_MODEL,
      chatModel: v.GEMINI_CHAT_MODEL,
      python: v.RAG_PYTHON,
      workerDir: path.resolve(backendRoot, v.RAG_WORKER_DIR ?? "../rag"),
      timeoutMs: v.RAG_TIMEOUT_MS,
      maxConcurrency: v.RAG_MAX_CONCURRENCY,
    },
  } as const;
}

export const env = loadEnvironment(process.env);
