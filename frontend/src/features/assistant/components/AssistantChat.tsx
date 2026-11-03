import { useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/ui/Button";
import { ASSISTANT_LIMITS } from "@/constants/assistant.constants";
import { errorMessage } from "@/utils/errorMessage";
import { assistantService } from "../services/assistant.service";
import type { AssistantStatus, Exchange } from "../types/assistant.types";
import { questionSchema } from "../validation/assistant.validation";
import { AnswerCard } from "./AnswerCard";

function statusHint(status: AssistantStatus | null, statusError: string) {
  if (statusError) return statusError;
  if (!status) return "Checking whether the assistant is available…";
  if (!status.enabled) return "The AI assistant isn't enabled on this server. An administrator can turn it on.";
  if (!status.readySources) return "Index a saved item to begin: choose “Index for AI” on a source.";
  return null;
}

/** Question box and conversation. Each question is answered independently from indexed sources. */
export function AssistantChat({ status, statusError }: { status: AssistantStatus | null; statusError: string }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const ready = Boolean(status?.enabled && status.readySources);
  const hint = statusHint(status, statusError);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = questionSchema.safeParse(question);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid question");
    setBusy(true);
    setError("");
    try {
      const answer = await assistantService.ask(parsed.data);
      setHistory((h) => [...h, { id: nextId.current++, question: parsed.data, answer }]);
      setQuestion("");
    } catch (e) {
      setError(errorMessage(e, "The assistant couldn't answer. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chat" aria-labelledby="chat-title">
      <header className="chat__header">
        <h1 id="chat-title">Ask your space</h1>
        <p className="muted">
          Answers come only from your indexed sources, with exact quotes. They can still be incomplete or wrong — check
          the evidence.
        </p>
        {status && (
          <p className="badge badge--ai">
            {status.readySources} of {status.sourceLimit} sources ready
          </p>
        )}
      </header>
      {hint && <Alert tone="info">{hint}</Alert>}
      {status && status.staleSources > 0 && (
        <Alert tone="info">{status.staleSources} source(s) need reindexing because the AI model changed.</Alert>
      )}
      <div className="chat__history" aria-live="polite">
        {history.map((exchange) => (
          <AnswerCard key={exchange.id} exchange={exchange} />
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      <form className="chat__form" onSubmit={submit}>
        <label htmlFor="question" className="sr-only">
          Ask a question about your indexed sources
        </label>
        <input
          id="question"
          className="input"
          value={question}
          maxLength={ASSISTANT_LIMITS.questionMaxLength}
          placeholder="Ask a question about your space…"
          disabled={!ready || busy}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" icon="send" loading={busy} disabled={!ready || question.trim().length < 3}>
          Ask
        </Button>
      </form>
      <p className="field__hint">Questions and the most relevant excerpts are sent to the AI provider.</p>
    </section>
  );
}
