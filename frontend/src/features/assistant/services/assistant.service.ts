import { apiClient } from "@/services/apiClient";
import type { ContentItem } from "@/features/content/types/content.types";
import type { Answer, AssistantStatus } from "../types/assistant.types";

const source = (id: string) => `/assistant/sources/${encodeURIComponent(id)}`;

export const assistantService = {
  status: () => apiClient.get<AssistantStatus>("/assistant/status"),
  /** Indexing requires explicit user consent; omit `text` to fetch the public page. */
  index: (id: string, text: string) =>
    apiClient.put<ContentItem>(source(id), { consent: true, ...(text.trim() ? { text } : {}) }),
  removeIndex: (id: string) => apiClient.delete(source(id)),
  ask: (question: string) => apiClient.post<Answer>("/assistant/ask", { question }),
};
