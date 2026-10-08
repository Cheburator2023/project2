import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { MarkdownEditor } from "./MarkdownEditor";

const theme = createTheme();

function Harness({ initial = "" }: { initial?: string }) {
	const [value, setValue] = useState(initial);
	return (
		<ThemeProvider theme={theme}>
			<MarkdownEditor value={value} onChange={setValue} />
		</ThemeProvider>
	);
}

describe("MarkdownEditor formatted preview", () => {
	it("edits a snapshot contenteditable so ReactMarkdown cannot duplicate the first paste", async () => {
		const user = userEvent.setup();
		const pasted = "Большой фрагмент описания задачи для проверки дубля";
		render(<Harness initial="Черновик" />);

		const previewMarkdown = document.querySelector(
			".tracker-md-wysiwyg .wmde-markdown",
		);
		expect(previewMarkdown?.getAttribute("contenteditable")).not.toBe("true");
		expect(previewMarkdown?.textContent).toContain("Черновик");

		await user.click(
			document.querySelector(".tracker-md-wysiwyg") as HTMLElement,
		);

		const editable = document.querySelector<HTMLElement>(
			".tracker-md-wysiwyg [contenteditable='true']",
		);
		expect(editable).toBeTruthy();
		expect(
			document.querySelectorAll(".tracker-md-wysiwyg .wmde-markdown"),
		).toHaveLength(1);
		expect((editable?.textContent?.match(/Черновик/g) ?? []).length).toBe(1);

		editable?.focus();
		fireEvent.paste(editable as HTMLElement, {
			clipboardData: {
				getData: (type: string) => (type === "text/plain" ? pasted : ""),
			},
		});

		const text = (editable?.textContent ?? "").replace(/\s+/g, " ").trim();
		expect(text.split(pasted).length - 1).toBe(1);
		expect(text).toContain(pasted);
	});
});
