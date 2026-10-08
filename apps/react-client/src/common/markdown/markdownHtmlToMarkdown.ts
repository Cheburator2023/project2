function textOf(node: Node): string {
	return node.textContent ?? "";
}

function childrenToMarkdown(node: Node): string {
	return Array.from(node.childNodes).map(nodeToMarkdown).join("");
}

function listItems(el: Element, ordered: boolean): string {
	const items = Array.from(el.children).filter(
		(child) => child.tagName.toLowerCase() === "li",
	);
	return items
		.map((item, index) => {
			const body = childrenToMarkdown(item).trim();
			const prefix = ordered ? `${index + 1}. ` : "- ";
			return `${prefix}${body.replace(/\n/g, "\n  ")}`;
		})
		.join("\n");
}

function nodeToMarkdown(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) {
		return textOf(node);
	}
	if (node.nodeType !== Node.ELEMENT_NODE) return "";
	const el = node as HTMLElement;
	const mermaid = el.getAttribute("data-mermaid-source");
	if (mermaid) {
		return `\n\n\`\`\`mermaid\n${mermaid.trim()}\n\`\`\`\n\n`;
	}
	const tag = el.tagName.toLowerCase();
	if (tag === "svg" || el.getAttribute("data-name") === "mermaid") {
		return "";
	}
	const inner = childrenToMarkdown(el);
	switch (tag) {
		case "h1":
			return `\n\n# ${inner.trim()}\n\n`;
		case "h2":
			return `\n\n## ${inner.trim()}\n\n`;
		case "h3":
			return `\n\n### ${inner.trim()}\n\n`;
		case "h4":
			return `\n\n#### ${inner.trim()}\n\n`;
		case "h5":
			return `\n\n##### ${inner.trim()}\n\n`;
		case "h6":
			return `\n\n###### ${inner.trim()}\n\n`;
		case "strong":
		case "b":
			return inner ? `**${inner}**` : "";
		case "em":
		case "i":
			return inner ? `*${inner}*` : "";
		case "del":
		case "s":
		case "strike":
			return inner ? `~~${inner}~~` : "";
		case "code":
			return el.closest("pre") ? inner : inner ? `\`${inner}\`` : "";
		case "pre": {
			const mermaidChild = el.querySelector("[data-mermaid-source]");
			const mermaidSource = mermaidChild?.getAttribute("data-mermaid-source");
			if (mermaidSource) {
				return `\n\n\`\`\`mermaid\n${mermaidSource.trim()}\n\`\`\`\n\n`;
			}
			const code = (el.querySelector("code")?.textContent ?? el.textContent ?? "")
				.replace(/\n$/, "");
			return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
		}
		case "a": {
			const href = el.getAttribute("href") ?? "";
			if (!href) return inner;
			return `[${inner}](${href})`;
		}
		case "img": {
			const src = el.getAttribute("src") ?? "";
			const alt = el.getAttribute("alt") ?? "";
			return src ? `![${alt}](${src})` : "";
		}
		case "ul":
			return `\n\n${listItems(el, false)}\n\n`;
		case "ol":
			return `\n\n${listItems(el, true)}\n\n`;
		case "li":
			return inner;
		case "blockquote": {
			const body = inner.trim();
			if (!body) return "";
			return `\n\n${body
				.split("\n")
				.map((line) => `> ${line}`)
				.join("\n")}\n\n`;
		}
		case "br":
			return "  \n";
		case "hr":
			return "\n\n---\n\n";
		case "p":
		case "div":
		case "section":
			return `\n\n${inner}\n\n`;
		default:
			return inner;
	}
}

export function htmlToMarkdown(root: Element): string {
	return childrenToMarkdown(root).replace(/\n{3,}/g, "\n\n").trim();
}
