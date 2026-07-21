import { describe, expect, it } from "vitest";
import { resolveDefaultValueOptions } from "./FieldDefaultValueControl";

describe("resolveDefaultValueOptions", () => {
	it("берёт значения из справочника (form value = label)", () => {
		expect(
			resolveDefaultValueOptions(
				{ type: "string" },
				"v2.method.demo",
				{
					"v2.method.demo": {
						enums: ["Не требуется", "1"],
						enumNames: ["Не требуется", "1"],
					},
				},
			),
		).toEqual([
			{ value: "Не требуется", label: "Не требуется" },
			{ value: "1", label: "1" },
		]);
	});

	it("берёт inline enum / enumNames", () => {
		expect(
			resolveDefaultValueOptions(
				{
					type: "string",
					enum: ["a", "b"],
					enumNames: ["Альфа", "Бета"],
				},
				undefined,
				{},
			),
		).toEqual([
			{ value: "a", label: "Альфа" },
			{ value: "b", label: "Бета" },
		]);
	});

	it("приоритет у справочника над inline enum", () => {
		expect(
			resolveDefaultValueOptions(
				{ type: "string", enum: ["x"] },
				"dict",
				{ dict: { enums: ["y"], enumNames: ["Y"] } },
			),
		).toEqual([{ value: "y", label: "Y" }]);
	});
});
