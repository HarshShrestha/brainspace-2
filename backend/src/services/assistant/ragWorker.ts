import { spawn } from "node:child_process";
import { ERROR_CODES, type ErrorCode } from "../../constants/errorCodes.js";
import { ApiError } from "../../utils/ApiError.js";
import { logger } from "../../utils/logger.js";

export type RagOperation = "index" | "embed_query" | "answer";

export interface RagWorker {
  run<T>(operation: RagOperation, payload: unknown): Promise<T>;
}

export interface RagWorkerConfig {
  python: string;
  workerDir: string;
  timeoutMs: number;
  maxConcurrency: number;
  /** Variables passed to the worker. Nothing else from the API's environment is inherited. */
  env: Record<string, string>;
}

const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

function codeForStatus(status: number): ErrorCode {
  if (status === 400) return ERROR_CODES.validation;
  if (status === 422) return ERROR_CODES.aiSourceUnreadable;
  if (status === 429) return ERROR_CODES.rateLimited;
  if (status === 503) return ERROR_CODES.aiNotConfigured;
  return ERROR_CODES.aiUnavailable;
}

const unavailable = () =>
  new ApiError(503, ERROR_CODES.aiUnavailable, "The AI service is unavailable. Please try again later.");

/** Bounds the number of simultaneous worker processes; excess calls wait in FIFO order. */
class Semaphore {
  private active = 0;
  private readonly waiting: (() => void)[] = [];
  constructor(private readonly limit: number) {}

  async acquire() {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  release() {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }
}

function runOnce<T>(config: RagWorkerConfig, operation: RagOperation, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = spawn(config.python, ["-m", "brainspace_rag.worker"], {
      cwd: config.workerDir,
      env: config.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    let stdoutBytes = 0;
    let stderr = "";
    let settled = false;

    const finish = (error: ApiError | null, data?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(data as T);
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new ApiError(504, ERROR_CODES.aiUnavailable, "AI processing took too long. Please try again."));
    }, config.timeoutMs);

    child.on("error", (err) => {
      logger.error({ err }, "Could not start the RAG worker");
      finish(unavailable());
    });
    child.stdin.on("error", () => finish(unavailable()));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      if (stderr.length < 4096) stderr += chunk;
    });
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        finish(new ApiError(502, ERROR_CODES.aiUnavailable, "The AI service returned an oversized response."));
        return;
      }
      stdout.push(chunk);
    });
    child.on("close", (exitCode) => {
      if (settled) return;
      let result: { ok?: unknown; data?: unknown; status?: unknown; message?: unknown };
      try {
        result = JSON.parse(Buffer.concat(stdout).toString("utf8"));
      } catch {
        logger.error({ exitCode, stderr: stderr.slice(0, 2048), operation }, "RAG worker returned invalid output");
        finish(new ApiError(502, ERROR_CODES.aiUnavailable, "The AI service returned an invalid response."));
        return;
      }
      if (result.ok === true) {
        finish(null, result.data as T);
        return;
      }
      const status =
        typeof result.status === "number" &&
        Number.isInteger(result.status) &&
        result.status >= 400 &&
        result.status <= 599
          ? result.status
          : 502;
      const message = typeof result.message === "string" ? result.message : "AI processing failed.";
      finish(new ApiError(status, codeForStatus(status), message));
    });

    child.stdin.end(JSON.stringify({ operation, payload }));
  });
}

export function createRagWorker(config: RagWorkerConfig): RagWorker {
  const semaphore = new Semaphore(config.maxConcurrency);
  return {
    async run<T>(operation: RagOperation, payload: unknown) {
      await semaphore.acquire();
      try {
        return await runOnce<T>(config, operation, payload);
      } finally {
        semaphore.release();
      }
    },
  };
}
