/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "./markdownHtmlToMarkdown";

function parse(html: string): Element {
	const wrap = document.createElement("div");
	wrap.innerHTML = html;
	return wrap;
}

describe("htmlToMarkdown", () => {
	it("round-trips headings, emphasis and lists so preview edits stay as markdown", () => {
		expect(
			htmlToMarkdown(
				parse(
					"<h2>Заголовок</h2><p>Текст с <strong>жирным</strong> и <em>курсивом</em></p><ul><li>один</li><li>два</li></ul>",
				),
			),
		).toBe(
			"## Заголовок\n\nТекст с **жирным** и *курсивом*\n\n- один\n- два",
		);
	});

	it("keeps mermaid source from data attribute instead of SVG", () => {
		expect(
			htmlToMarkdown(
				parse(
					'<pre><code data-mermaid-source="graph TD; A-->B">ignored</code></pre>',
				),
			),
		).toBe("```mermaid\ngraph TD; A-->B\n```");
	});
});
