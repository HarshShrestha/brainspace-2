import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router";
import { RecoilRoot, type MutableSnapshot } from "recoil";
import { sessionState } from "@/store/session.atoms";
import type { User } from "@/features/authentication/types/auth.types";

export const testUser: User = { id: "u1", username: "alice", createdAt: "2026-01-01T00:00:00.000Z" };

export function signedIn({ set }: MutableSnapshot) {
  set(sessionState, { status: "authenticated", user: testUser });
}

/** Renders `ui` (or `routes`) inside Recoil and an in-memory router. */
export function renderWithProviders(
  ui: ReactElement | null,
  {
    route = "/",
    routes,
    initializeState,
  }: { route?: string; routes?: RouteObject[]; initializeState?: (snapshot: MutableSnapshot) => void } = {},
) {
  const router = createMemoryRouter(routes ?? [{ path: "*", element: ui }], { initialEntries: [route] });
  return {
    router,
    ...render(
      <RecoilRoot initializeState={initializeState}>
        <RouterProvider router={router} />
      </RecoilRoot>,
    ),
  };
}

export const contentItem = (overrides = {}) => ({
  id: "c1",
  title: "Design notes",
  link: "https://www.example.com/notes",
  type: "article" as const,
  tags: ["design"],
  folderId: null,
  ai: null,
  createdAt: "2026-02-03T10:00:00.000Z",
  updatedAt: "2026-02-03T10:00:00.000Z",
  ...overrides,
});
