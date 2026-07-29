import { describe, expect, it } from "vitest";
import { resolveSelectedCatalogValueCodes } from "./TriggerValueChoices";

const SOURCE_TYPE_VALUES = [
	{ code: "внутренний", label: "Внутренний" },
	{ code: "внешний", label: "Внешний" },
] as const;

const RULE_SEED = {
	paramCode: "type",
	paramName: "Тип системы-источника",
};

describe("resolveSelectedCatalogValueCodes", () => {
	it("maps label-as-code rule to dictionary code (source type)", () => {
		const selected = resolveSelectedCatalogValueCodes(
			SOURCE_TYPE_VALUES,
			[
				{
					id: "r1",
					paramCode: "type",
					paramName: "Тип системы-источника",
					operator: "=",
					valueCode: "Внутренний",
					valueLabel: "Внутренний",
				},
			],
			RULE_SEED,
		);
		expect([...selected]).toEqual(["внутренний"]);
	});

	it("maps case-insensitive code match", () => {
		const selected = resolveSelectedCatalogValueCodes(
			SOURCE_TYPE_VALUES,
			[
				{
					id: "r1",
					paramCode: "type",
					paramName: "Тип системы-источника",
					operator: "=",
					valueCode: "ВНУТРЕННИЙ",
					valueLabel: null,
				},
			],
			RULE_SEED,
		);
		expect([...selected]).toEqual(["внутренний"]);
	});

	it("maps multi values by label when code is stale", () => {
		const selected = resolveSelectedCatalogValueCodes(
			SOURCE_TYPE_VALUES,
			[
				{
					id: "r1",
					paramCode: "type",
					paramName: "Тип системы-источника",
					operator: "in",
					valueCode: null,
					valueLabel: null,
					values: [
						{ code: "Внутренний", label: "Внутренний" },
						{ code: "Внешний", label: "Внешний" },
					],
				},
			],
			RULE_SEED,
		);
		expect(selected).toEqual(new Set(["внутренний", "внешний"]));
	});

	it("keeps raw code when catalog is empty", () => {
		const selected = resolveSelectedCatalogValueCodes(
			[],
			[
				{
					id: "r1",
					paramCode: "type",
					paramName: "Тип системы-источника",
					operator: "=",
					valueCode: "Внутренний",
					valueLabel: "Внутренний",
				},
			],
			RULE_SEED,
		);
		expect([...selected]).toEqual(["Внутренний"]);
	});
});
