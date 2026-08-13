import { describe, expect, it } from "vitest";
import { formatV2TemplateVersionDisplayName } from "./v2-template-version-label.util";

describe("formatV2TemplateVersionDisplayName", () => {
	it("formats Name-N without leading zeros", () => {
		expect(formatV2TemplateVersionDisplayName("Схема ДАДМ", 3)).toBe(
			"Схема ДАДМ-3",
		);
		expect(formatV2TemplateVersionDisplayName("Схема", "01")).toBe("Схема-1");
		expect(formatV2TemplateVersionDisplayName("  X  ", 12)).toBe("X-12");
	});

	it("falls back when name or version missing", () => {
		expect(formatV2TemplateVersionDisplayName(null, 2)).toBe("Схема-2");
		expect(formatV2TemplateVersionDisplayName("Схема", null)).toBe("Схема");
	});
});
