import { describe, expect, it } from "vitest";
import { normalizeDecimalSeparatorForSchema } from "./TextFieldCustomWidget";

describe("normalizeDecimalSeparatorForSchema", () => {
	it("приводит запятую к точке для числовых полей — иначе RJSF теряет значение", () => {
		expect(normalizeDecimalSeparatorForSchema("1,5", { type: "number" })).toBe(
			"1.5",
		);
		expect(normalizeDecimalSeparatorForSchema("10,", { type: "number" })).toBe(
			"10.",
		);
		expect(normalizeDecimalSeparatorForSchema("2,5", { type: "integer" })).toBe(
			"2.5",
		);
		expect(
			normalizeDecimalSeparatorForSchema("1,5", {
				type: ["number", "null"],
			}),
		).toBe("1.5");
	});

	it("не трогает текстовые поля — запятая в них значимый символ", () => {
		expect(
			normalizeDecimalSeparatorForSchema("Иванов, Иван", { type: "string" }),
		).toBe("Иванов, Иван");
		expect(normalizeDecimalSeparatorForSchema("a,b", undefined)).toBe("a,b");
	});
});
