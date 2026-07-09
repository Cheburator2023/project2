import { describe, expect, it } from "vitest";
import {
	buildSourceTypicalWorksCatalogRule,
	patchV2TypicalWorksLogicRules,
	V2_SOURCE_SYSTEMS_ARRAY_PATH,
} from "./v2-default-typical-works-logic.util";

describe("v2-default-typical-works-logic.util", () => {
	it("replaces legacy static-tasks rule with worksCatalog and v5 paths", () => {
		const patched = patchV2TypicalWorksLogicRules({
			rules: [
				{
					id: "unified-source-typical-works",
					kind: "task_trigger",
					targetPath: "/streamDataSources/sourceTypicalTasks",
					dependencies: ["/streamDataSources/sourceSystems"],
					condition: true,
					payload: {
						mode: "generated_rows",
						tasks: [{ name: "Legacy", match: { type: "Внутренний" } }],
						sourceArrayPath: "streamDataSources.sourceSystems",
						outputArrayPath: "streamDataSources.sourceTypicalTasks",
					},
				},
			],
		});

		const rule =
			patched.rules.find((r) => r.id === "unified-source-typical-works") ??
			buildSourceTypicalWorksCatalogRule();
		const payload = rule.payload as Record<string, unknown>;
		expect(payload.worksCatalog).toBe(true);
		expect(payload.sourceArrayPath).toBe(V2_SOURCE_SYSTEMS_ARRAY_PATH);
		expect(payload.tasks).toBeUndefined();
	});

	it("does not inject catalog rules into partial logic graphs", () => {
		const patched = patchV2TypicalWorksLogicRules({
			rules: [
				{
					id: "unified-typical-total",
					kind: "computed",
					targetPath: "/summary/typicalTotal",
					condition: true,
					dependencies: [],
				},
			],
		});
		expect(
			patched.rules.some((rule) => rule.id === "unified-source-typical-works"),
		).toBe(false);
	});

	it("injects source catalog rule when schema has source systems and typical tasks block", () => {
		const patched = patchV2TypicalWorksLogicRules(
			{ rules: [] },
			{
				jsonSchema: {
					type: "object",
					properties: {
						detailInfo: {
							type: "object",
							properties: {
								sourceSystems: { type: "array", items: { type: "object" } },
								myTypicalTasks: { type: "array", items: { type: "object" } },
							},
						},
					},
				},
				uiSchema: {
					detailInfo: {
						myTypicalTasks: {
							"ui:options": { archComponent: "typicalWork" },
						},
					},
				},
			},
		);

		const rule = patched.rules.find(
			(r) => r.id === "unified-source-typical-works",
		);
		expect(rule).toBeDefined();
		const payload = rule?.payload as Record<string, unknown>;
		expect(payload.worksCatalog).toBe(true);
		expect(payload.outputArrayPath).toBe("detailInfo.myTypicalTasks");
		expect(rule?.targetPath).toBe("/detailInfo/myTypicalTasks");
	});

	it("injects source catalog rule for root-level typicalWork block without sourceSystems", () => {
		const patched = patchV2TypicalWorksLogicRules(
			{ rules: [] },
			{
				jsonSchema: {
					type: "object",
					properties: {
						field_KQX2OsDx: { type: "string", title: "Поле справочника" },
						field_SId8TZKZ: {
							type: "array",
							items: { type: "object" },
							title: "Типовые работы",
						},
					},
				},
				uiSchema: {
					field_SId8TZKZ: {
						"ui:options": { archComponent: "typicalWork" },
					},
				},
			},
		);

		const rule = patched.rules.find(
			(r) => r.id === "unified-source-typical-works",
		);
		expect(rule).toBeDefined();
		const payload = rule?.payload as Record<string, unknown>;
		expect(payload.outputArrayPath).toBe("field_SId8TZKZ");
		expect(rule?.targetPath).toBe("/field_SId8TZKZ");
	});

	it("migrates legacy visibility row-total rules to row_computed", () => {
		const patched = patchV2TypicalWorksLogicRules({
			rules: [
				{
					id: "default-row-source-typical-task-total",
					kind: "visibility",
					targetPath: "/streamDataSources/sourceTypicalTasks",
					dependencies: [],
					condition: { "*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }] },
					payload: {
						fieldVar: "total",
						arrayPath: "streamDataSources.sourceTypicalTasks",
					},
				},
			],
		});
		const rule = patched.rules.find(
			(r) => r.id === "default-row-source-typical-task-total",
		);
		expect(rule?.kind).toBe("row_computed");
	});

	it("patches slash-format legacy control typical tasks paths", () => {
		const patched = patchV2TypicalWorksLogicRules({
			rules: [
				{
					id: "unified-typical-total",
					kind: "computed",
					targetPath: "/summary/typicalTotal",
					condition: true,
					dependencies: [
						"/streamDataSources/sourceTypicalTasks",
						"/streamModelControl/control/controlTypicalTasks",
					],
				},
			],
		});
		const rule = patched.rules.find((r) => r.id === "unified-typical-total");
		expect(rule?.dependencies).toEqual([
			"/streamDataSources/sourceTypicalTasks",
			"/streamModelControl/field_Khn6-HAW",
		]);
	});
});
