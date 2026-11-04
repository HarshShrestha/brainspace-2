export interface AssistantStatus {
  enabled: boolean;
  indexedSources: number;
  readySources: number;
  staleSources: number;
  sourceLimit: number;
}

export interface AnswerSource {
  contentId: string;
  title: string;
  link: string;
  quote: string;
  sourceType: "page" | "pasted";
  indexedAt: string;
}

export interface Answer {
  answer: string;
  abstained: boolean;
  sources: AnswerSource[];
}

export interface Exchange {
  id: number;
  question: string;
  answer: Answer;
}
