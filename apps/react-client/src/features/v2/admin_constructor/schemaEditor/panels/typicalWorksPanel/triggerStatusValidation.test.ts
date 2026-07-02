import { describe, expect, it } from "vitest";
import type { V2TypicalWorkParameterDto } from "@smart-anketa/api-contract";
import {
	catalogForTriggerRuleGroup,
	computeTriggerStatus,
} from "./typicalWorkPatchErrors";

describe("trigger status validation for schema-picked params", () => {
	const schemaParam: V2TypicalWorkParameterDto = {
		id: "schema:field",
		code: "field_8pFvwc-v",
		name: "Наличие реплики в DAPP",
		description: "streamDataSources.sourceSystems[].field_8pFvwc-v",
		values: [
			{
				id: "v-true",
				code: "true",
				label: "Да",
				coefficient: null,
				sortOrder: 0,
				validFrom: "2025-01-01",
				validTo: null,
			},
			{
				id: "v-false",
				code: "false",
				label: "Нет",
				coefficient: null,
				sortOrder: 1,
				validFrom: "2025-01-01",
				validTo: null,
			},
		],
	};

	const methodologyCatalog: V2TypicalWorkParameterDto[] = [
		{
			id: "meth-1",
			code: "тип_источника_данных",
			name: "Тип источника данных",
			description: null,
			values: [
				{
					id: "v-in",
					code: "внутренний",
					label: "Внутренний",
					coefficient: null,
					sortOrder: 0,
					validFrom: "2025-01-01",
					validTo: null,
				},
			],
		},
	];

	it("validates schema field against its own values, not methodology catalog", () => {
		const catalog = catalogForTriggerRuleGroup(
			{
				paramCode: "field_8pFvwc-v",
				paramName: "Наличие реплики в DAPP",
			},
			[schemaParam],
			methodologyCatalog,
		);

		expect(catalog).toHaveLength(1);
		expect(catalog[0]?.code).toBe("field_8pFvwc-v");
		expect(catalog[0]?.values.map((v) => v.label)).toEqual(["Да", "Нет"]);
	});

	it("marks boolean schema trigger as appears when value is valid", () => {
		expect(
			computeTriggerStatus(
				[
					{
						paramCode: "field_8pFvwc-v",
						paramName: "Наличие реплики в DAPP",
						valueCode: "false",
						valueLabel: "Нет",
					},
				],
				[schemaParam],
				methodologyCatalog,
			),
		).toBe("appears");
	});
});
