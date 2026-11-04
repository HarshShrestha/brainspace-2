# 08 · AI Assistant (Retrieval-Augmented Generation)

The assistant answers questions **only** from sources a user has explicitly indexed, and shows the
exact quotes it relied on. It's optional and off by default.

## 1. Flow

```
Index (PUT /assistant/sources/:id, consent: true)
  API: ownership + 250-source limit
   └─► worker "index": pasted text OR SSRF-safe fetch of the public page
        → normalize → ≤ 24,000 chars → ≤ 30 overlapping ~1,000-char chunks (word boundaries)
        → Gemini batch embeddings (RETRIEVAL_DOCUMENT, 768 dims)
  API: validate output → insert chunks with a new generation ID → set content.ai
       → delete chunks of other generations

Ask (POST /assistant/ask)
  API: load the user's sources indexed with the current model (≤ 250)
   └─► worker "embed_query" (RETRIEVAL_QUERY)
  API: stream the user's chunks, skip stale generations, cosine similarity,
       keep the top 5 with score ≥ 0.35                         (no vectors leave the API)
   └─► worker "answer": structured JSON {answer, evidence[{id, quote}]}
        → every quote must be verbatim in its excerpt (12–1,500 chars, 1–5 quotes)
        → separate "support check" call must return supported=true
        → otherwise abstain
  API: re-verify quotes, attach title/link/source type/date, return
```

## 2. Safeguards

| Risk | Safeguard |
| --- | --- |
| Hallucinated answers | Retrieval threshold; mandatory verbatim quotes; independent support check; abstention by default. |
| Fabricated or misattributed quotes | Checked against the cited excerpt in Python, and again in the API. |
| Prompt injection inside sources | Excerpts framed as untrusted data; structured output; quotes must exist verbatim; output shown as text. Reduces, but cannot eliminate, the risk. |
| SSRF via "fetch this page" | See [05_SECURITY.md](05_SECURITY.md#ai-worker): public-IP validation, IP pinning, redirect revalidation, size/time caps. |
| Cross-user leakage | Every chunk query is scoped by `userId`; sources are re-joined to their owner's current generation. |
| Stale or deleted text | Chunks are deleted before content, on link change and on index removal; old generations are ignored. |
| Cost and abuse | Opt-in per server; explicit consent per index; 30 AI requests / 15 min / user; ≤ 250 sources; concurrency cap; timeouts. |
| Secret exposure | The worker gets only provider settings; nothing is logged. |

**Limits of these measures:** they reduce risk but don't guarantee truth or completeness. Sources can
be wrong, and an exact quote doesn't prove the answer follows from it. The UI tells users to check the
evidence, and the assistant must not be used for medical, legal, financial or safety decisions.

## 3. Configuration

```dotenv
RAG_ENABLED=true
GEMINI_API_KEY=<server-side secret>
GEMINI_EMBEDDING_MODEL=gemini-embedding-001   # changing it marks existing indexes stale
GEMINI_CHAT_MODEL=gemini-3.8-flash           # must support structured JSON output
RAG_TIMEOUT_MS=120000
RAG_MAX_CONCURRENCY=4
```

The worker needs Python 3.10+ (no third-party packages) and outbound HTTPS to
`generativelanguage.googleapis.com` and to the public pages users index. Block private address ranges
at the network layer too.

## 4. What is supported

- Public HTML and plain-text pages (no JavaScript rendering, no logins).
- Pasted text for anything else: PDFs, private pages, video/audio transcripts.
- Each question is independent (no chat memory). Pages aren't re-fetched automatically; use **Reindex**.

## 5. Evaluation

Automated suites verify **safety behaviour** with a deterministic stub: retrieval and abstention,
fabricated and misattributed quotes, failed support checks, user isolation, deletion and reindexing,
consent, SSRF address classes, and worker protocol errors.

They don't measure **answer quality** with a real model. Before relying on the assistant in production:

1. Build a held-out, consented, labelled set that represents real use: relevant and irrelevant sources,
   paraphrases, multi-document questions, missing or contradictory evidence, long documents,
   multilingual text, injection attempts.
2. Measure retrieval recall@5 and context precision, answer correctness, claim-level faithfulness
   (human-rated), citation validity, abstention precision/recall, p50/p95 latency, error rate and
   cost per question.
3. Tune `retrievalThreshold`/`retrievalTopK` (`backend/src/constants/assistant.constants.ts`) on a
   separate development set, then re-run the held-out set. Repeat on every model, prompt or chunking change.
4. Agree release thresholds with the product owner, and monitor privacy-safe aggregates in production.

## 6. Extending

- **Another provider:** implement `embed()` and `generate_json()` in a new module next to `provider.py`,
  and select it in `config.py`. The pipeline and API don't change.
- **Larger corpora:** replace the in-process scan with a vector index (e.g. MongoDB Atlas Vector Search),
  keeping the generation and ownership filters. Then raise `maxIndexedSources`.
- **Streaming answers / chat memory:** these need a long-lived worker or service, and a revised
  security review of the worker boundary.
