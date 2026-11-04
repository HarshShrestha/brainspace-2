import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/utils/errorMessage";
import { assistantService } from "../services/assistant.service";
import type { AssistantStatus } from "../types/assistant.types";

const UNAVAILABLE = "Couldn't check whether the assistant is available.";

export function useAssistantStatus() {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    assistantService
      .status()
      .then((result) => active && setStatus(result))
      .catch((e: unknown) => active && setError(errorMessage(e, UNAVAILABLE)));
    return () => {
      active = false;
    };
  }, []);

  /** Re-checks after an index changes (called from event handlers). */
  const refresh = useCallback(async () => {
    try {
      setStatus(await assistantService.status());
      setError("");
    } catch (e) {
      setError(errorMessage(e, UNAVAILABLE));
    }
  }, []);

  return { status, error, refresh };
}
