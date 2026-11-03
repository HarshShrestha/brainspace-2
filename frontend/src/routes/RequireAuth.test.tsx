import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sessionState } from "@/store/session.atoms";
import { renderWithProviders, signedIn } from "@tests/render";
import { RequireAuth } from "./RequireAuth";

const routes = [
  { path: "/login", element: <p>Sign-in page</p> },
  { element: <RequireAuth />, children: [{ path: "/private", element: <p>Private page</p> }] },
];

describe("RequireAuth", () => {
  it("redirects anonymous users to sign in, remembering where they were going", async () => {
    const { router } = renderWithProviders(null, {
      routes,
      route: "/private",
      initializeState: ({ set }) => set(sessionState, { status: "anonymous", user: null }),
    });
    expect(await screen.findByText("Sign-in page")).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ from: "/private" });
  });

  it("renders the route for signed-in users", async () => {
    renderWithProviders(null, { routes, route: "/private", initializeState: signedIn });
    expect(await screen.findByText("Private page")).toBeInTheDocument();
  });

  it("shows a loading state while the session is being checked", () => {
    renderWithProviders(null, { routes, route: "/private" });
    expect(screen.getByRole("status")).toHaveTextContent("Opening your space");
  });
});
