import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/apiClient";
import { renderWithProviders, testUser } from "@tests/render";
import { authService } from "../services/auth.service";
import { AuthForm } from "./AuthForm";

const routes = (mode: "login" | "register") => [
  { path: "/login", element: <AuthForm mode={mode} /> },
  { path: "/", element: <p>Library</p> },
];

describe("AuthForm", () => {
  it("validates registration input before calling the API", async () => {
    const register = vi.spyOn(authService, "register");
    renderWithProviders(null, { routes: routes("register"), route: "/login" });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Username"), "a!");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Use 3–30 letters, numbers or underscores")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
    expect(register).not.toHaveBeenCalled();
  });

  it("signs in, normalizing the username, and navigates to the library", async () => {
    const login = vi.spyOn(authService, "login").mockResolvedValue(testUser);
    renderWithProviders(null, { routes: routes("login"), route: "/login" });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Username"), " Alice ");
    await user.type(screen.getByLabelText("Password"), "correct horse");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(login).toHaveBeenCalledWith({ username: "alice", password: "correct horse" });
    expect(await screen.findByText("Library")).toBeInTheDocument();
  });

  it("shows the server's error message", async () => {
    vi.spyOn(authService, "login").mockRejectedValue(
      new ApiError("Incorrect username or password", 401, "INVALID_CREDENTIALS"),
    );
    renderWithProviders(null, { routes: routes("login"), route: "/login" });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect username or password");
  });
});
