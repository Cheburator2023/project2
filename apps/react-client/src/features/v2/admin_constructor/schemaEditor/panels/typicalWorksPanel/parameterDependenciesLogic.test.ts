import { describe, expect, it } from "vitest";
import type { V2TypicalWorkParameterDto } from "@smart-anketa/api-contract";
import { buildParamFieldBindings } from "./parameterDependenciesLogic";
import type { FieldPathHint } from "../../types";

describe("buildParamFieldBindings", () => {
	const hints: FieldPathHint[] = [
		{
			pointer: "/streamDataSources/sourceSystems/items/type",
			key: "type",
			title: "Тип системы-источника",
			varPath: "streamDataSources.sourceSystems[].type",
			dictionaryCode: null,
			codesPreview: ["Внутренний", "Внешний"],
		},
	];

	const schemaParams: V2TypicalWorkParameterDto[] = [
		{
			id: "schema:field-type",
			code: "field_type123",
			name: "Тип системы-источника",
			description: "/streamDataSources/sourceSystems/items/type",
			schemaPointer: "/streamDataSources/sourceSystems/items/type",
			values: [
				{
					id: "v1",
					code: "internal",
					label: "Внутренний",
					coefficient: null,
					sortOrder: 0,
					validFrom: "2025-01-01",
					validTo: null,
				},
			],
		},
	];

	it("binds catalog param by exact title", () => {
		const catalog: V2TypicalWorkParameterDto[] = [
			{
				id: "cat-1",
				code: "тип_системы_источника",
				name: "Тип системы-источника",
				description: null,
				values: [],
			},
		];
		const bindings = buildParamFieldBindings(catalog, hints, schemaParams);
		expect(bindings[0]?.pointers).toContain(
			"/streamDataSources/sourceSystems/items/type",
		);
	});

	it("binds legacy catalog code via schema alias bridge", () => {
		const catalog: V2TypicalWorkParameterDto[] = [
			{
				id: "cat-1",
				code: "тип_системы_источника",
				name: "Тип источника (внешний)",
				description: null,
				values: [],
			},
		];
		const bindings = buildParamFieldBindings(catalog, hints, schemaParams);
		expect(bindings[0]?.pointers).toContain(
			"/streamDataSources/sourceSystems/items/type",
		);
	});

	it("binds by field key when catalog code matches hint.key", () => {
		const catalog: V2TypicalWorkParameterDto[] = [
			{
				id: "cat-2",
				code: "type",
				name: "Другое имя",
				description: null,
				values: [],
			},
		];
		const bindings = buildParamFieldBindings(catalog, hints, schemaParams);
		expect(bindings[0]?.pointers).toContain(
			"/streamDataSources/sourceSystems/items/type",
		);
	});
});
