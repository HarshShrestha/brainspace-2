import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { contentItem } from "@tests/render";
import { assistantService } from "../services/assistant.service";
import { IndexSourceDialog } from "./IndexSourceDialog";

describe("IndexSourceDialog", () => {
  it("requires explicit consent, then indexes the pasted text", async () => {
    const indexed = contentItem({ ai: { indexedAt: "2026-01-01", sourceType: "pasted", chunkCount: 1, stale: false } });
    const index = vi.spyOn(assistantService, "index").mockResolvedValue(indexed);
    const onChanged = vi.fn();
    const onClose = vi.fn();
    render(<IndexSourceDialog item={contentItem()} onChanged={onChanged} onClose={onClose} />);

    const submit = screen.getByRole("button", { name: "Index source" });
    expect(submit).toBeDisabled();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Source text/), "Some source text");
    await user.click(screen.getByRole("checkbox"));
    await user.click(submit);

    expect(index).toHaveBeenCalledWith("c1", "Some source text");
    expect(onChanged).toHaveBeenCalledWith(indexed);
    expect(onClose).toHaveBeenCalled();
  });

  it("removes an existing index", async () => {
    const remove = vi.spyOn(assistantService, "removeIndex").mockResolvedValue(undefined);
    const onChanged = vi.fn();
    const ai = { indexedAt: "2026-01-01", sourceType: "page" as const, chunkCount: 3, stale: false };
    render(<IndexSourceDialog item={contentItem({ ai })} onChanged={onChanged} onClose={() => {}} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Remove index" }));
    expect(remove).toHaveBeenCalledWith("c1");
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ ai: null }));
  });
});
