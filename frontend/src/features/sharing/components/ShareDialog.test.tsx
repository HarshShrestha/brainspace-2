import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { shareService } from "../services/share.service";
import { ShareDialog } from "./ShareDialog";

const TOKEN = "A".repeat(43);

describe("ShareDialog", () => {
  it("creates a link and shows it once", async () => {
    vi.spyOn(shareService, "status").mockResolvedValue({ active: false, createdAt: null });
    vi.spyOn(shareService, "rotate").mockResolvedValue({ token: TOKEN, createdAt: "2026-01-01T00:00:00.000Z" });
    render(<ShareDialog onClose={() => {}} />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Create link" }));
    expect(await screen.findByLabelText("Your share link")).toHaveValue(`${window.location.origin}/shared/${TOKEN}`);
    expect(screen.getByRole("button", { name: "Turn off sharing" })).toBeInTheDocument();
  });

  it("explains an existing link cannot be shown again, and can revoke it", async () => {
    vi.spyOn(shareService, "status").mockResolvedValue({ active: true, createdAt: "2026-01-01T00:00:00.000Z" });
    const revoke = vi.spyOn(shareService, "revoke").mockResolvedValue(undefined);
    render(<ShareDialog onClose={() => {}} />);
    expect(await screen.findByText(/only shown when it is created/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Turn off sharing" }));
    expect(revoke).toHaveBeenCalled();
    expect(await screen.findByText(/Sharing turned off/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create link" })).toBeInTheDocument();
  });
});
