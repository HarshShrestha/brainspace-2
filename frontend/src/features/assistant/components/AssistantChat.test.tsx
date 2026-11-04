import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/apiClient";
import { assistantService } from "../services/assistant.service";
import type { AssistantStatus } from "../types/assistant.types";
import { AssistantChat } from "./AssistantChat";

const ready: AssistantStatus = { enabled: true, indexedSources: 1, readySources: 1, staleSources: 0, sourceLimit: 250 };

describe("AssistantChat", () => {
  it("explains and disables input when the assistant is off", () => {
    render(<AssistantChat status={{ ...ready, enabled: false }} statusError="" />);
    expect(screen.getByText(/isn't enabled on this server/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ask a question/)).toBeDisabled();
  });

  it("asks for an indexed source first", () => {
    render(<AssistantChat status={{ ...ready, readySources: 0 }} statusError="" />);
    expect(screen.getByText(/Index a saved item to begin/)).toBeInTheDocument();
  });

  it("shows the answer with quoted, linked evidence", async () => {
    vi.spyOn(assistantService, "ask").mockResolvedValue({
      answer: "Blue cards.",
      abstained: false,
      sources: [
        {
          contentId: "c1",
          title: "Design notes",
          link: "https://example.com/notes",
          quote: "The project uses blue cards.",
          sourceType: "pasted",
          indexedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    render(<AssistantChat status={ready} statusError="" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Ask a question/), "Which cards?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Blue cards.")).toBeInTheDocument();
    expect(screen.getByText("“The project uses blue cards.”")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Design notes" })).toHaveAttribute("href", "https://example.com/notes");
    expect(screen.getByText(/pasted text, not verified/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ask a question/)).toHaveValue("");
  });

  it("shows provider errors instead of an answer", async () => {
    vi.spyOn(assistantService, "ask").mockRejectedValue(new ApiError("AI unavailable", 503, "AI_UNAVAILABLE"));
    render(<AssistantChat status={ready} statusError="" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Ask a question/), "Anything?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("AI unavailable");
  });
});
