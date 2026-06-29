import { describe, expect, it } from "vitest";
import {
	isSelectValueEmpty,
	renderSelectPlaceholderValue,
} from "./SelectWithPlaceholder";

describe("SelectWithPlaceholder", () => {
	it("detects empty values", () => {
		expect(isSelectValueEmpty("")).toBe(true);
		expect(isSelectValueEmpty([])).toBe(true);
		expect(isSelectValueEmpty("x")).toBe(false);
	});

	it("renders placeholder for empty value", () => {
		const node = renderSelectPlaceholderValue("", "Выберите") as {
			props: { children: string };
		};
		expect(node.props.children).toBe("Выберите");
	});

	it("renders selected label via renderSelected", () => {
		const node = renderSelectPlaceholderValue("a", "Выберите", () => "Alpha");
		expect(node).toBe("Alpha");
	});
});
