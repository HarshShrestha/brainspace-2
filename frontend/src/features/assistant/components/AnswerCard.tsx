import { Icon } from "@/components/common/Icon";
import { formatDate } from "@/utils/formatDate";
import type { Exchange } from "../types/assistant.types";

/** One question and its answer, with every supporting quote and where it came from. */
export function AnswerCard({ exchange }: { exchange: Exchange }) {
  const { question, answer } = exchange;
  return (
    <div className="exchange">
      <p className="exchange__question">{question}</p>
      <div className={`exchange__answer ${answer.abstained ? "exchange__answer--abstained" : ""}`.trim()}>
        <p className="eyebrow">
          <Icon name={answer.abstained ? "help" : "auto_awesome"} />{" "}
          {answer.abstained ? "No confident answer" : "Answer"}
        </p>
        <p>{answer.answer}</p>
        {answer.sources.length > 0 && (
          <div className="evidence">
            <p className="evidence__heading">Evidence</p>
            {answer.sources.map((source, index) => (
              <figure className="evidence__item" key={`${source.contentId}-${index}`}>
                <blockquote>“{source.quote}”</blockquote>
                <figcaption>
                  <a href={source.link} target="_blank" rel="noopener noreferrer">
                    {source.title}
                  </a>
                  <span className="muted">
                    {source.sourceType === "pasted"
                      ? " · pasted text, not verified against the page"
                      : " · from the page"}
                    {` · indexed ${formatDate(source.indexedAt)}`}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
