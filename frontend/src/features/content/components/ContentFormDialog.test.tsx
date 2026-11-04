import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/apiClient";
import { contentItem } from "@tests/render";
import { ContentFormDialog } from "./ContentFormDialog";

const folders = [{ id: "f1", name: "Research", itemCount: 0, createdAt: "2026-01-01" }];

describe("ContentFormDialog", () => {
  it("submits normalized input and closes", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<ContentFormDialog folders={folders} defaultFolderId="f1" onSubmit={onSubmit} onClose={onClose} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "Great talk");
    await user.type(screen.getByLabelText("Link"), "https://video.example/talk");
    await user.selectOptions(screen.getByLabelText("Type"), "video");
    await user.type(screen.getByLabelText(/Tags/), "Talks, Ideas, talks");
    await user.click(screen.getByRole("button", { name: "Save to space" }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Great talk",
      link: "https://video.example/talk",
      type: "video",
      tags: ["talks", "ideas"],
      folderId: "f1",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows field errors and does not submit invalid links", async () => {
    const onSubmit = vi.fn();
    render(<ContentFormDialog folders={[]} onSubmit={onSubmit} onClose={() => {}} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "Bad");
    await user.type(screen.getByLabelText("Link"), "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: "Save to space" }));
    expect(screen.getByText(/full link starting with http/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("prefills when editing and keeps the dialog open on server errors", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError("Folder not found", 404, "NOT_FOUND"));
    const onClose = vi.fn();
    render(<ContentFormDialog item={contentItem()} folders={folders} onSubmit={onSubmit} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Edit item" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Design notes");
    expect(screen.getByLabelText(/Tags/)).toHaveValue("design");
    await userEvent.setup().click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Folder not found");
    expect(onClose).not.toHaveBeenCalled();
  });
});
