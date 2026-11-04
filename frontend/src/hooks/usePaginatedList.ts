import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Page } from "@/types/api.types";
import { errorMessage } from "@/utils/errorMessage";

interface ListState<T, P> {
  /** The request this state belongs to; any other key means a newer request is in flight. */
  key: string | null;
  status: "ready" | "error";
  items: T[];
  page: P | null;
  nextCursor: string | null;
  error: string;
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

/**
 * Cursor-paginated loading. Refetches from the first page whenever `key` changes (or `reload()`
 * is called), aborts superseded requests and ignores stale responses. `page` is the first page,
 * for endpoints that return extra fields next to `items`.
 */
export function usePaginatedList<T, P extends Page<T> = Page<T>>(
  fetchPage: (cursor: string | undefined, signal: AbortSignal) => Promise<P>,
  key: string,
) {
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = `${key}#${reloadCount}`;
  const [state, setState] = useState<ListState<T, P>>({
    key: null,
    status: "ready",
    items: [],
    page: null,
    nextCursor: null,
    error: "",
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchRef = useRef(fetchPage);
  useLayoutEffect(() => {
    fetchRef.current = fetchPage;
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchRef
      .current(undefined, controller.signal)
      .then((page) =>
        setState({ key: requestKey, status: "ready", items: page.items, page, nextCursor: page.nextCursor, error: "" }),
      )
      .catch((e: unknown) => {
        if (isAbort(e) || controller.signal.aborted) return;
        setState({ key: requestKey, status: "error", items: [], page: null, nextCursor: null, error: errorMessage(e) });
      });
    return () => controller.abort();
  }, [requestKey]);

  const current = state.key === requestKey;

  const loadMore = useCallback(async () => {
    if (!current || !state.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchRef.current(state.nextCursor, new AbortController().signal);
      setState((s) =>
        s.key === requestKey ? { ...s, items: [...s.items, ...page.items], nextCursor: page.nextCursor } : s,
      );
    } catch (e) {
      setState((s) => (s.key === requestKey ? { ...s, error: errorMessage(e) } : s));
    } finally {
      setLoadingMore(false);
    }
  }, [current, state.nextCursor, loadingMore, requestKey]);

  /** Local, server-confirmed edits to the loaded items (e.g. after an update or delete). */
  const setItems = useCallback((update: (items: T[]) => T[]) => {
    setState((s) => ({ ...s, items: update(s.items) }));
  }, []);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  return {
    items: current ? state.items : [],
    page: current ? state.page : null,
    status: current ? state.status : ("loading" as const),
    error: current ? state.error : "",
    hasMore: current && state.nextCursor !== null,
    loadMore,
    loadingMore,
    setItems,
    reload,
  };
}
