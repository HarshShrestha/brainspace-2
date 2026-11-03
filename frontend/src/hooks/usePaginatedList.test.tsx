import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePaginatedList } from "./usePaginatedList";

describe("usePaginatedList", () => {
  it("loads the first page, then appends the next one", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], nextCursor: "c2" })
      .mockResolvedValueOnce({ items: [3], nextCursor: null });
    const { result } = renderHook(() => usePaginatedList<number>(fetchPage, "k"));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(true);

    await act(() => result.current.loadMore());
    expect(fetchPage).toHaveBeenLastCalledWith("c2", expect.any(AbortSignal));
    expect(result.current.items).toEqual([1, 2, 3]);
    expect(result.current.hasMore).toBe(false);
  });

  it("refetches from scratch when the key changes and ignores the superseded response", async () => {
    let resolveFirst: (v: { items: string[]; nextCursor: null }) => void = () => {};
    const fetchPage = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ items: ["new"], nextCursor: null });
    const { result, rerender } = renderHook(({ k }) => usePaginatedList<string>(fetchPage, k), {
      initialProps: { k: "a" },
    });
    rerender({ k: "b" });
    await waitFor(() => expect(result.current.items).toEqual(["new"]));
    act(() => resolveFirst({ items: ["stale"], nextCursor: null }));
    expect(result.current.items).toEqual(["new"]);
  });

  it("exposes errors", async () => {
    const { result } = renderHook(() => usePaginatedList(() => Promise.reject(new Error("Offline")), "k"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("Offline");
  });
});
