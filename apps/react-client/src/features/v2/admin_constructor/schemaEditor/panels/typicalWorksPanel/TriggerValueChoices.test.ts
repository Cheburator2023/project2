import { describe, expect, it } from "vitest";
import type { V2TypicalWorkRuleDto } from "@smart-anketa/api-contract";
import { resolveSelectedCatalogValueCodes } from "./TriggerValueChoices";

const SOURCE_TYPE_VALUES = [
	{ code: "внутренний", label: "Внутренний" },
	{ code: "внешний", label: "Внешний" },
] as const;

const RULE_SEED = {
	paramCode: "type",
	paramName: "Тип системы-источника",
};

function rule(overrides: Partial<V2TypicalWorkRuleDto>): V2TypicalWorkRuleDto {
	return {
		id: "r1",
		streamExecutor: "Источники данных",
		paramCode: "type",
		paramName: "Тип системы-источника",
		operator: "=",
		valueCode: null,
		valueLabel: null,
		...overrides,
	};
}

describe("resolveSelectedCatalogValueCodes", () => {
	it("maps label-as-code rule to dictionary code (source type)", () => {
		const selected = resolveSelectedCatalogValueCodes(
			SOURCE_TYPE_VALUES,
			[rule({ valueCode: "Внутренний", valueLabel: "Внутренний" })],
			RULE_SEED,
		);
		expect([...selected]).toEqual(["внутренний"]);
	});

	it("maps case-insensitive code match", () => {
		const selected = resolveSelectedCatalogValueCodes(
			SOURCE_TYPE_VALUES,
			[rule({ valueCode: "ВНУТРЕННИЙ" })],
			RULE_SEED,
		);
		expect([...selected]).toEqual(["внутренний"]);
	});

	it("maps multi values by label when code is stale", () => {
		const selected = resolveSelectedCatalogValueCodes(
			SOURCE_TYPE_VALUES,
			[
				rule({
					operator: "in",
					values: [
						{ code: "Внутренний", label: "Внутренний" },
						{ code: "Внешний", label: "Внешний" },
					],
				}),
			],
			RULE_SEED,
		);
		expect(selected).toEqual(new Set(["внутренний", "внешний"]));
	});

	it("keeps raw code when catalog is empty", () => {
		const selected = resolveSelectedCatalogValueCodes(
			[],
			[rule({ valueCode: "Внутренний", valueLabel: "Внутренний" })],
			RULE_SEED,
		);
		expect([...selected]).toEqual(["Внутренний"]);
	});
});
