import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { contentItem } from "@tests/render";
import { ContentCard, type ContentCardActions } from "./ContentCard";

const actions = (): ContentCardActions => ({
  folders: [{ id: "f1", name: "Research", itemCount: 0, createdAt: "" }],
  canIndex: true,
  onEdit: vi.fn(),
  onMove: vi.fn(),
  onIndex: vi.fn(),
  onDelete: vi.fn(),
});

describe("ContentCard", () => {
  it("opens links safely in a new tab and shows the host", () => {
    render(<ContentCard item={contentItem()} />);
    const link = screen.getByRole("link", { name: "Design notes" });
    expect(link).toHaveAttribute("href", "https://www.example.com/notes");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });

  it("exposes owner actions", async () => {
    const a = actions();
    const item = contentItem();
    render(<ContentCard item={item} actions={a} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete Design notes" }));
    await user.click(screen.getByRole("button", { name: "Edit Design notes" }));
    await user.click(screen.getByRole("button", { name: "Index Design notes for AI" }));
    await user.selectOptions(screen.getByLabelText("Move Design notes to folder"), "f1");
    expect(a.onDelete).toHaveBeenCalledWith(item);
    expect(a.onEdit).toHaveBeenCalledWith(item);
    expect(a.onIndex).toHaveBeenCalledWith(item);
    expect(a.onMove).toHaveBeenCalledWith(item, "f1");
  });

  it("flags stale AI indexes", () => {
    const ai = { indexedAt: "2026-01-01", sourceType: "page" as const, chunkCount: 2, stale: true };
    render(<ContentCard item={contentItem({ ai })} actions={actions()} />);
    expect(screen.getByText("Reindex needed")).toBeInTheDocument();
  });
});
