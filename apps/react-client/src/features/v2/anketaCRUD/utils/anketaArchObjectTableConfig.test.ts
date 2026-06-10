import { describe, expect, it } from "vitest";
import {
	isArchObjectFilled,
	isMeaningfulAnketaFieldValue,
} from "./anketaArchObjectTableConfig";

describe("isMeaningfulAnketaFieldValue", () => {
	it("treats false and zero as empty", () => {
		expect(isMeaningfulAnketaFieldValue(false)).toBe(false);
		expect(isMeaningfulAnketaFieldValue(0)).toBe(false);
		expect(isMeaningfulAnketaFieldValue(null)).toBe(false);
	});

	it("treats true, strings and selections as filled", () => {
		expect(isMeaningfulAnketaFieldValue(true)).toBe(true);
		expect(isMeaningfulAnketaFieldValue("Разработка")).toBe(true);
		expect(isMeaningfulAnketaFieldValue(["Батч"])).toBe(true);
	});
});

describe("isArchObjectFilled", () => {
	it("returns false for empty object and schema-default booleans only", () => {
		expect(isArchObjectFilled({})).toBe(false);
		expect(
			isArchObjectFilled({
				autoCertification: false,
				featureStore: false,
				confidentialData: false,
			}),
		).toBe(false);
	});

	it("returns true when user selected a meaningful field", () => {
		expect(
			isArchObjectFilled({
				workType: "Разработка",
				autoCertification: false,
			}),
		).toBe(true);
	});

	it("returns true for nested object with meaningful leaf", () => {
		expect(
			isArchObjectFilled({
				pkRecalibration: false,
				pirmBlock: { connectISRepo: true },
			}),
		).toBe(true);
	});
});
