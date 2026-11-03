import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("is a labelled dialog that closes on Escape and traps focus", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Add item" onClose={onClose}>
        <input aria-label="Title" />
        <button type="button">Save</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Add item" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByLabelText("Title")).toHaveFocus();

    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
