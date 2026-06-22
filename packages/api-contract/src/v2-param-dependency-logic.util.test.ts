import { describe, expect, it } from "vitest";
import {
	buildParamDependencyVisibilityRules,
	evaluateParamDependencyRulesForSource,
	filterCoefficientLogicForHiddenFields,
	isParamDependencyLogicRule,
	mergeParamDependencyRulesIntoLogic,
	parseParamDependencyGraphFromLogic,
	resolveHiddenParamCodesForSource,
	resolveHiddenSourceFieldKeys,
	type V2ParamDependencyGraph,
	type V2ParamFieldBinding,
} from "./v2-param-dependency-logic.util";

const bindings: V2ParamFieldBinding[] = [
	{
		paramCode: "source",
		paramName: "Источник",
		pointers: ["/detailInfo/parameters/streamsOutsideDADM"],
	},
	{
		paramCode: "target",
		paramName: "Цель",
		pointers: ["/detailInfo/parameters/streamNames"],
	},
];

const graph: V2ParamDependencyGraph = {
	targets: [
		{
			targetParamCode: "target",
			rules: [
				{
					id: "r1",
					sourceParamCode: "source",
					operator: "=",
					valueCode: "yes",
					valueLabel: "Да",
				},
			],
		},
	],
};

describe("v2-param-dependency-logic.util", () => {
	it("builds visibility rules for mapped pointers", () => {
		const rules = buildParamDependencyVisibilityRules(graph, bindings);
		expect(rules).toHaveLength(1);
		expect(rules[0]).toMatchObject({
			kind: "visibility",
			targetPath: "/detailInfo/parameters/streamNames",
			condition: {
				"==": [{ var: "detailInfo.parameters.streamsOutsideDADM" }, "Да"],
			},
			payload: {
				paramDependency: true,
				targetParamCode: "target",
			},
		});
		expect(isParamDependencyLogicRule(rules[0]!)).toBe(true);
	});

	it("roundtrips graph through logic rules", () => {
		const merged = mergeParamDependencyRulesIntoLogic(
			[
				{
					id: "other",
					kind: "hint",
					targetPath: "/",
					dependencies: [],
					condition: true,
				},
			],
			graph,
			bindings,
		);
		expect(merged).toHaveLength(2);
		expect(parseParamDependencyGraphFromLogic(merged)).toEqual(graph);
	});

	it("uses some() for sibling fields inside array items", () => {
		const arrayBindings: V2ParamFieldBinding[] = [
			{
				paramCode: "tip",
				paramName: "Тип",
				pointers: ["/streamDataSources/sourceSystems/items/type"],
			},
			{
				paramCode: "slozhnost",
				paramName: "Сложность",
				pointers: ["/streamDataSources/sourceSystems/items/domainComplexity"],
			},
		];
		const arrayGraph: V2ParamDependencyGraph = {
			targets: [
				{
					targetParamCode: "slozhnost",
					rules: [
						{
							id: "r1",
							sourceParamCode: "tip",
							operator: "=",
							valueCode: "vnutrennij",
							valueLabel: "Внутренний",
						},
					],
				},
			],
		};
		const rules = buildParamDependencyVisibilityRules(arrayGraph, arrayBindings);
		expect(rules[0]?.condition).toEqual({
			some: [
				{ var: "streamDataSources.sourceSystems" },
				{ "==": [{ var: "type" }, "Внутренний"] },
			],
		});
	});

	it("resolves hidden param codes from source row", () => {
		const graph: V2ParamDependencyGraph = {
			targets: [
				{
					targetParamCode: "slozhnost",
					rules: [
						{
							id: "r1",
							sourceParamCode: "type",
							operator: "=",
							valueCode: "vnutrennij",
							valueLabel: "Внутренний",
						},
					],
				},
			],
		};
		const defs = [
			{ code: "type", name: "Тип системы-источника" },
			{ code: "slozhnost", name: "Сложность предметной области" },
		];
		const hidden = resolveHiddenParamCodesForSource(
			graph,
			{ type: "Внешний" },
			defs,
		);
		expect(hidden.has("slozhnost")).toBe(true);
		expect(
			evaluateParamDependencyRulesForSource(
				graph.targets[0]!.rules,
				{ type: "Внутренний" },
				defs,
			),
		).toBe(true);
	});

	it("filters coefficient logic for hidden source fields", () => {
		const logic = {
			"*": [
				{
					if: [
						{ "==": [{ var: "domainComplexity" }, "Средняя"] },
						1,
						1,
					],
				},
				{
					if: [
						{ "==": [{ var: "entityVolume" }, "Малое"] },
						0.5,
						1,
					],
				},
			],
		};
		const filtered = filterCoefficientLogicForHiddenFields(
			logic,
			new Set(["domainComplexity"]),
		);
		expect((filtered as { "*": unknown[] })["*"][0]).toBe(1);
		expect((filtered as { "*": unknown[] })["*"][1]).toEqual(logic["*"][1]);
	});

	it("maps hidden param codes to source field keys", () => {
		const keys = resolveHiddenSourceFieldKeys(
			new Set(["slozhnost_predmetnoj_oblasti"]),
			[
				{
					code: "slozhnost_predmetnoj_oblasti",
					name: "Сложность предметной области",
				},
			],
			{ domainComplexity: "Средняя" },
		);
		expect(keys.has("domainComplexity")).toBe(true);
	});
});
