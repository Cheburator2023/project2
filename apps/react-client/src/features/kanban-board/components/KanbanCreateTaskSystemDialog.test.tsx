import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KanbanCreateTaskSystemDialog } from "./KanbanCreateTaskSystemDialog";

describe("KanbanCreateTaskSystemDialog", () => {
	it("does not confirm without a system", () => {
		const onConfirm = vi.fn();
		render(
			<KanbanCreateTaskSystemDialog
				open
				onClose={vi.fn()}
				onConfirm={onConfirm}
			/>,
		);

		const createButton = screen.getByRole("button", { name: "Создать" });
		expect(createButton).toBeDisabled();
		fireEvent.click(createButton);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("confirms selected systems", () => {
		const onConfirm = vi.fn();
		render(
			<KanbanCreateTaskSystemDialog
				open
				onClose={vi.fn()}
				onConfirm={onConfirm}
			/>,
		);

		fireEvent.mouseDown(screen.getByRole("combobox"));
		fireEvent.click(screen.getByRole("option", { name: "SUM" }));
		// multi-select stays open; close via Escape then create
		fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
		fireEvent.click(screen.getByRole("button", { name: "Создать" }));

		expect(onConfirm).toHaveBeenCalledWith(["sum"]);
	});
});
