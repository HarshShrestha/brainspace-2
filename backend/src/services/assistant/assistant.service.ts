import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../../config/environment.js";
import { ASSISTANT_LIMITS, SOURCE_TYPES } from "../../constants/assistant.constants.js";
import { ERROR_CODES } from "../../constants/errorCodes.js";
import { Content } from "../../models/content.model.js";
import { ContentChunk } from "../../models/content-chunk.model.js";
import type { AnswerDto, AssistantStatusDto } from "../../types/api.types.js";
import { ApiError } from "../../utils/ApiError.js";
import { getContent } from "../content.service.js";
import { cosineSimilarity, TopK } from "./ranking.js";
import { createRagWorker, type RagWorker } from "./ragWorker.js";

export const ABSTAIN_MESSAGE =
  "I couldn't find enough reliable evidence in your indexed sources to answer that. Try rephrasing, or index a relevant source.";

const finiteNumber = z.number().refine(Number.isFinite);
const vector = z.array(finiteNumber).min(1);

/** The worker is a separate process: validate everything it returns before trusting it. */
const indexResultSchema = z.object({
  model: z.string(),
  sourceType: z.enum(SOURCE_TYPES),
  chunks: z
    .array(z.object({ text: z.string().min(1), embedding: vector }))
    .min(1)
    .max(100),
});
const answerResultSchema = z.object({
  abstained: z.boolean(),
  answer: z.string().max(5000),
  evidence: z.array(z.object({ id: z.string(), quote: z.string() })).max(10),
});

let worker: RagWorker | null = null;

function passThrough(...names: string[]) {
  return Object.fromEntries(names.flatMap((name) => (process.env[name] ? [[name, process.env[name]!]] : [])));
}

function getWorker(): RagWorker {
  worker ??= createRagWorker({
    python: env.rag.python,
    workerDir: env.rag.workerDir,
    timeoutMs: env.rag.timeoutMs,
    maxConcurrency: env.rag.maxConcurrency,
    env: {
      ...passThrough("PATH", "PYTHONPATH", "SSL_CERT_FILE", "SSL_CERT_DIR", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY"),
      LANG: "C.UTF-8",
      PYTHONIOENCODING: "utf-8",
      PYTHONDONTWRITEBYTECODE: "1",
      GEMINI_API_KEY: env.rag.geminiApiKey,
      GEMINI_EMBEDDING_MODEL: env.rag.embeddingModel,
      GEMINI_CHAT_MODEL: env.rag.chatModel,
    },
  });
  return worker;
}

/** Test seam: replace the subprocess worker with an in-memory fake. */
export function setRagWorker(replacement: RagWorker | null) {
  worker = replacement;
}

function assertEnabled() {
  if (!env.rag.enabled)
    throw new ApiError(503, ERROR_CODES.aiNotConfigured, "The AI assistant is not enabled on this server.");
}

const abstention = (): AnswerDto => ({ answer: ABSTAIN_MESSAGE, abstained: true, sources: [] });

export async function getStatus(userId: string): Promise<AssistantStatusDto> {
  const [indexedSources, readySources] = await Promise.all([
    Content.countDocuments({ userId, ai: { $ne: null } }),
    Content.countDocuments({ userId, "ai.model": env.rag.embeddingModel }),
  ]);
  return {
    enabled: env.rag.enabled,
    indexedSources,
    readySources,
    staleSources: indexedSources - readySources,
    sourceLimit: ASSISTANT_LIMITS.maxIndexedSources,
  };
}

export async function indexSource(userId: string, contentId: string, pastedText?: string) {
  assertEnabled();
  const item = await Content.findOne({ _id: contentId, userId }).lean();
  if (!item) throw ApiError.notFound("Content not found");
  if (!item.ai && (await Content.countDocuments({ userId, ai: { $ne: null } })) >= ASSISTANT_LIMITS.maxIndexedSources)
    throw new ApiError(
      409,
      ERROR_CODES.limitExceeded,
      `You can index up to ${ASSISTANT_LIMITS.maxIndexedSources} sources. Remove an index first.`,
    );

  const raw = await getWorker().run("index", { link: item.link, text: pastedText ?? "" });
  const result = indexResultSchema.parse(raw);
  if (result.model !== env.rag.embeddingModel)
    throw new ApiError(502, ERROR_CODES.aiUnavailable, "Embedding model mismatch");

  const generation = randomUUID();
  await ContentChunk.insertMany(
    result.chunks.map((chunk, ordinal) => ({
      userId,
      contentId,
      generation,
      model: result.model,
      ordinal,
      text: chunk.text,
      embedding: chunk.embedding,
    })),
  );
  const ai = {
    indexedAt: new Date(),
    model: result.model,
    sourceType: result.sourceType,
    chunkCount: result.chunks.length,
    generation,
  };
  const { matchedCount } = await Content.updateOne({ _id: contentId, userId }, { $set: { ai } });
  if (!matchedCount) {
    await ContentChunk.deleteMany({ contentId, generation });
    throw ApiError.notFound("Content was deleted while it was being indexed");
  }
  // Garbage-collect superseded chunk sets. Re-read so a concurrent reindex that won the race keeps its chunks.
  const current = await Content.findOne({ _id: contentId, userId }).select("ai.generation").lean();
  if (current?.ai) await ContentChunk.deleteMany({ userId, contentId, generation: { $ne: current.ai.generation } });
  return getContent(userId, contentId);
}

export async function removeSource(userId: string, contentId: string) {
  const { matchedCount } = await Content.updateOne({ _id: contentId, userId }, { $set: { ai: null } });
  if (!matchedCount) throw ApiError.notFound("Content not found");
  await ContentChunk.deleteMany({ userId, contentId });
}

interface Candidate {
  id: string;
  contentId: string;
  title: string;
  link: string;
  text: string;
  sourceType: (typeof SOURCE_TYPES)[number];
  indexedAt: Date;
}

/** Embeds the question, then streams the user's current chunks and keeps the best few in memory. */
async function retrieve(userId: string, question: string): Promise<Candidate[]> {
  const sources = await Content.find({ userId, "ai.model": env.rag.embeddingModel }).select("title link ai").lean();
  if (!sources.length) return [];
  const byId = new Map(sources.map((source) => [source._id.toString(), source]));
  const queryVector = vector.parse(await getWorker().run("embed_query", { question }));

  const best = new TopK<Omit<Candidate, "id">>();
  const cursor = ContentChunk.find({ userId, model: env.rag.embeddingModel, contentId: { $in: [...byId.keys()] } })
    .select("contentId generation text embedding")
    .lean()
    .cursor({ batchSize: 200 });
  for await (const chunk of cursor) {
    const source = byId.get(chunk.contentId.toString());
    if (!source?.ai || source.ai.generation !== chunk.generation) continue;
    best.offer(cosineSimilarity(queryVector, chunk.embedding), {
      contentId: source._id.toString(),
      title: source.title,
      link: source.link,
      text: chunk.text,
      sourceType: source.ai.sourceType,
      indexedAt: source.ai.indexedAt,
    });
  }
  return best.results().map((candidate, index) => ({ id: `S${index + 1}`, ...candidate }));
}

export async function ask(userId: string, question: string): Promise<AnswerDto> {
  assertEnabled();
  const candidates = await retrieve(userId, question);
  if (!candidates.length) return abstention();

  const raw = await getWorker().run("answer", {
    question,
    candidates: candidates.map(({ id, text }) => ({ id, text })),
  });
  const result = answerResultSchema.parse(raw);
  if (result.abstained || !result.answer.trim() || !result.evidence.length) return abstention();

  // Defense in depth: the worker already checks this, but never show a quote that isn't verbatim.
  const sources = result.evidence.map((evidence) => {
    const candidate = candidates.find((c) => c.id === evidence.id);
    return candidate && evidence.quote && candidate.text.includes(evidence.quote) ? { candidate, evidence } : null;
  });
  if (sources.some((s) => s === null)) return abstention();

  return {
    answer: result.answer,
    abstained: false,
    sources: sources.map((s) => ({
      contentId: s!.candidate.contentId,
      title: s!.candidate.title,
      link: s!.candidate.link,
      quote: s!.evidence.quote,
      sourceType: s!.candidate.sourceType,
      indexedAt: s!.candidate.indexedAt.toISOString(),
    })),
  };
}
