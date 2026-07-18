import { describe, expect, it } from "vitest";
import {
	buildSourceTypicalWorksCatalogRule,
	buildTypicalWorkRowTotalCondition,
	isTypicalWorksCatalogLogicComplete,
	patchV2TypicalWorksLogicRules,
	shouldSkipLegacyModelStreamStageSummary,
	syncTypicalWorksCatalogLogicSnapshot,
	upgradeTypicalWorksCatalogLogicRules,
	V2_MODEL_STREAM_SOURCE_ARRAY_PATH,
	V2_SOURCE_SYSTEMS_ARRAY_PATH,
} from "./v2-default-typical-works-logic.util";
import {
	isAtypicalWorksLogicComplete,
	resolveAnketaCalculationLogic,
} from "./v2-atypical-works-logic.util";

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
			patched.rules.find((r) => r.id.startsWith("typical-works-catalog-")) ??
			buildSourceTypicalWorksCatalogRule();
		const payload = rule.payload as Record<string, unknown>;
		expect(payload.worksCatalog).toBe(true);
		expect(payload.sourceArrayPath).toBe(V2_SOURCE_SYSTEMS_ARRAY_PATH);
		expect(payload.tasks).toBeUndefined();
	});

	it("injects row_computed and unified typical total for every typicalWork path", () => {
		const ui = {
			streamDataSources: {
				sourceTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
			},
			field_pirm: {
				"ui:options": { streamBlock: true, streamExecutor: "ПиРМ" },
				myTypical: { "ui:options": { archComponent: "typicalWork" } },
			},
		};
		const patched = patchV2TypicalWorksLogicRules({ rules: [] }, { uiSchema: ui });
		expect(
			patched.rules.some(
				(rule) => rule.id === "unified-typical-row-total:field_pirm_myTypical",
			),
		).toBe(true);
		const rowRule = patched.rules.find(
			(rule) => rule.id === "unified-typical-row-total:field_pirm_myTypical",
		);
		expect(rowRule?.condition).toEqual(buildTypicalWorkRowTotalCondition());
		const unified = patched.rules.find((rule) => rule.id === "unified-typical-total");
		expect(unified?.dependencies).toEqual(
			expect.arrayContaining([
				"/streamDataSources/sourceTypicalTasks",
				"/field_pirm/myTypical",
			]),
		);
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
			patched.rules.some((rule) =>
				rule.id.startsWith("typical-works-catalog-"),
			),
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

		const rule = patched.rules.find((r) =>
			r.id.startsWith("typical-works-catalog-"),
		);
		expect(rule).toBeDefined();
		const payload = rule?.payload as Record<string, unknown>;
		expect(payload.worksCatalog).toBe(true);
		expect(payload.outputArrayPath).toBe("detailInfo.myTypicalTasks");
		expect(payload.sourceContextPaths).toEqual([
			"detailInfo.dataMart",
			"detailInfo.dataProcess",
		]);
		expect(rule?.targetPath).toBe("/detailInfo/myTypicalTasks");
	});

	it("injects separate catalog rules per typicalWork block with bound work ids", () => {
		const patched = patchV2TypicalWorksLogicRules(
			{ rules: [] },
			{
				jsonSchema: {
					type: "object",
					properties: {
						field_a: { type: "array", items: { type: "object" } },
						field_b: { type: "array", items: { type: "object" } },
					},
				},
				uiSchema: {
					field_a: {
						"ui:options": {
							archComponent: "typicalWork",
							boundWorkIds: ["work-1"],
						},
					},
					field_b: {
						"ui:options": {
							archComponent: "typicalWork",
							boundWorkIds: ["work-2", "work-3"],
						},
					},
				},
			},
		);

		const rules = patched.rules.filter((r) =>
			r.id.startsWith("typical-works-catalog-"),
		);
		expect(rules).toHaveLength(2);
		const ruleA = rules.find((r) => r.targetPath === "/field_a");
		const ruleB = rules.find((r) => r.targetPath === "/field_b");
		expect((ruleA?.payload as Record<string, unknown>).allowedWorkIds).toEqual([
			"work-1",
		]);
		expect((ruleB?.payload as Record<string, unknown>).allowedWorkIds).toEqual([
			"work-2",
			"work-3",
		]);
	});

	it("disables catalog rule for empty boundWorkIds block", () => {
		const patched = patchV2TypicalWorksLogicRules(
			{ rules: [] },
			{
				jsonSchema: {
					type: "object",
					properties: {
						field_empty: { type: "array", items: { type: "object" } },
					},
				},
				uiSchema: {
					field_empty: {
						"ui:options": {
							archComponent: "typicalWork",
							boundWorkIds: [],
						},
					},
				},
			},
		);

		const rule = patched.rules.find((r) => r.targetPath === "/field_empty");
		expect(rule?.condition).toBe(false);
		expect((rule?.payload as Record<string, unknown>).allowedWorkIds).toEqual(
			[],
		);
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
			(r) => r.id === "typical-works-catalog-field_SId8TZKZ",
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
					condition: {
						reduce: [
							{ var: "streamDataSources.sourceTypicalTasks" },
							{ "+": [{ var: "accumulator" }, { var: "current.total" }] },
							0,
						],
					},
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
			"/streamModelControl/field_G0AoYAl8",
		]);
	});

	it("drops legacy unified-control-row-total rule", () => {
		const patched = patchV2TypicalWorksLogicRules({
			rules: [
				{
					id: "unified-control-row-total",
					kind: "row_computed",
					targetPath: "/streamModelControl/field_Khn6-HAW",
					condition: true,
					dependencies: [],
					payload: {
						fieldVar: "total",
						arrayPath: "streamModelControl.field_Khn6-HAW",
					},
				},
			],
		});
		expect(
			patched.rules.some((rule) => rule.id === "unified-control-row-total"),
		).toBe(false);
	});

	it("patches unified-typical-total to custom typicalWork output path from uiSchema", () => {
		const customPath = "streamDataSources.field_SId8TZKZ";
		const patched = patchV2TypicalWorksLogicRules(
			{
				rules: [
					{
						id: "unified-typical-total",
						kind: "computed",
						targetPath: "/summary/typicalTotal",
						condition: {
							reduce: [
								{ var: "streamDataSources.sourceTypicalTasks" },
								{ "+": [{ var: "accumulator" }, { var: "current.total" }] },
								0,
							],
						},
						dependencies: ["/streamDataSources/sourceTypicalTasks"],
					},
				],
			},
			{
				jsonSchema: {
					type: "object",
					properties: {
						streamDataSources: {
							type: "object",
							properties: {
								field_SId8TZKZ: { type: "array", items: { type: "object" } },
							},
						},
					},
				},
				uiSchema: {
					streamDataSources: {
						field_SId8TZKZ: {
							"ui:options": { archComponent: "typicalWork" },
						},
					},
				},
			},
		);

		const rule = patched.rules.find((r) => r.id === "unified-typical-total");
		expect(rule?.dependencies).toEqual([
			"/streamDataSources/field_SId8TZKZ",
		]);
		expect(JSON.stringify(rule?.condition)).toContain(customPath);
		expect(JSON.stringify(rule?.condition)).not.toContain(
			"streamDataSources.sourceTypicalTasks",
		);
	});

	it("injects model stream catalog rule for detailTypicalTasks block", () => {
		const patched = patchV2TypicalWorksLogicRules(
			{ rules: [] },
			{
				uiSchema: {
					detailInfo: {
						"ui:options": {
							streamBlock: true,
							streamExecutor: "Модельный стрим",
						},
						detailTypicalTasks: {
							"ui:options": {
								archComponent: "typicalWork",
								streamExecutor: "Модельный стрим",
							},
						},
					},
				},
			},
		);

		const rule = patched.rules.find(
			(entry) => entry.id === "typical-works-catalog-detailInfo-detailTypicalTasks",
		);
		expect(rule).toBeTruthy();
		const payload = rule?.payload as Record<string, unknown>;
		expect(payload.worksCatalogStream).toBe("Модельный стрим");
		expect(payload.worksCatalogAllArchComponents).toBe(true);
		expect(payload.sourceArrayPath).toBe("generalInfo.modelService");
	});

	it("isTypicalWorksCatalogLogicComplete returns true for fully patched logic", () => {
		const uiSchema = {
			detailInfo: {
				detailTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
			},
		};
		const patched = patchV2TypicalWorksLogicRules({ rules: [] }, { uiSchema });
		expect(isTypicalWorksCatalogLogicComplete(patched, { uiSchema })).toBe(true);
	});

	it("resolveAnketaCalculationLogic is no-op when logic snapshot is complete", () => {
		const uiSchema = {
			detailInfo: {
				detailTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
			},
			field_a: {
				field_b: { "ui:options": { archComponent: "atypicalWork" } },
			},
		};
		const patched = resolveAnketaCalculationLogic({ rules: [] }, { uiSchema });
		const resolved = resolveAnketaCalculationLogic(patched, { uiSchema });
		expect(resolved).toEqual(patched);
		expect(isAtypicalWorksLogicComplete(resolved, { uiSchema })).toBe(true);
	});

	it("upgradeTypicalWorksCatalogLogicRules adds model stream sourceArrayPath to stale logic", () => {
		const uiSchema = {
			detailInfo: {
				"ui:options": {
					streamBlock: true,
					streamExecutor: "Модельный стрим",
				},
				detailTypicalTasks: {
					"ui:options": {
						archComponent: "typicalWork",
						streamExecutor: "Модельный стрим",
					},
				},
			},
		};
		const staleLogic = {
			rules: [
				{
					id: "typical-works-catalog-detailInfo-detailTypicalTasks",
					kind: "task_trigger" as const,
					targetPath: "/detailInfo/detailTypicalTasks",
					condition: true,
					dependencies: [],
					payload: {
						mode: "generated_rows",
						worksCatalog: true,
						worksCatalogStream: "Модельный стрим",
						outputArrayPath: "detailInfo.detailTypicalTasks",
					},
				},
				{
					id: "unified-typical-row-total:detailInfo_detailTypicalTasks",
					kind: "row_computed" as const,
					targetPath: "/detailInfo/detailTypicalTasks",
					condition: true,
					dependencies: [],
					payload: {
						arrayPath: "detailInfo.detailTypicalTasks",
						fieldVar: "total",
					},
				},
				{
					id: "unified-typical-total",
					kind: "computed" as const,
					targetPath: "/summary/typicalTotal",
					condition: true,
					dependencies: [],
					payload: {},
				},
			],
		};

		const upgraded = upgradeTypicalWorksCatalogLogicRules(staleLogic, { uiSchema });
		const catalogRule = upgraded.rules.find(
			(rule) => rule.id === "typical-works-catalog-detailInfo-detailTypicalTasks",
		);
		expect(
			(catalogRule?.payload as Record<string, unknown>).sourceArrayPath,
		).toBe(V2_MODEL_STREAM_SOURCE_ARRAY_PATH);

		const resolved = resolveAnketaCalculationLogic(staleLogic, { uiSchema });
		expect(
			(
				resolved.rules.find(
					(rule) =>
						rule.id === "typical-works-catalog-detailInfo-detailTypicalTasks",
				)?.payload as Record<string, unknown>
			).sourceArrayPath,
		).toBe(V2_MODEL_STREAM_SOURCE_ARRAY_PATH);
	});

	it("syncTypicalWorksCatalogLogicSnapshot writes template boundWorkIds into logic", () => {
		const templateWorkId = "7147da4f-b4cd-445e-8ac3-838c4b106ca7";
		const uiSchema = {
			detailInfo: {
				"ui:options": {
					streamBlock: true,
					streamExecutor: "Модельный стрим",
				},
				detailTypicalTasks: {
					"ui:options": {
						archComponent: "typicalWork",
						streamExecutor: "Модельный стрим",
						boundWorkIds: [templateWorkId],
					},
				},
			},
		};
		const logic = {
			rules: [
				{
					id: "typical-works-catalog-detailInfo-detailTypicalTasks",
					kind: "task_trigger" as const,
					targetPath: "/detailInfo/detailTypicalTasks",
					condition: true,
					dependencies: [],
					payload: {
						mode: "generated_rows",
						worksCatalog: true,
						worksCatalogStream: "Модельный стрим",
						outputArrayPath: "detailInfo.detailTypicalTasks",
						allowedWorkIds: [
							"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
						],
					},
				},
				{
					id: "unified-typical-row-total:detailInfo_detailTypicalTasks",
					kind: "row_computed" as const,
					targetPath: "/detailInfo/detailTypicalTasks",
					condition: true,
					dependencies: [],
					payload: {
						arrayPath: "detailInfo.detailTypicalTasks",
						fieldVar: "total",
					},
				},
				{
					id: "unified-typical-total",
					kind: "computed" as const,
					targetPath: "/summary/typicalTotal",
					condition: true,
					dependencies: [],
					payload: {},
				},
			],
		};

		const synced = syncTypicalWorksCatalogLogicSnapshot(logic, { uiSchema });
		const catalogRule = synced.rules.find(
			(rule) => rule.id === "typical-works-catalog-detailInfo-detailTypicalTasks",
		);
		expect(
			(catalogRule?.payload as Record<string, unknown>).allowedWorkIds,
		).toEqual([templateWorkId]);
		expect(
			(catalogRule?.payload as Record<string, unknown>).sourceArrayPath,
		).toBe(V2_MODEL_STREAM_SOURCE_ARRAY_PATH);
		expect(
			(catalogRule?.payload as Record<string, unknown>).worksCatalogAllArchComponents,
		).toBe(true);
	});

	it("shouldSkipLegacyModelStreamStageSummary for model stream typicalWork block", () => {
		expect(
			shouldSkipLegacyModelStreamStageSummary({
				detailInfo: {
					detailTypicalTasks: {
						"ui:options": {
							archComponent: "typicalWork",
							streamExecutor: "Модельный стрим",
						},
					},
				},
			}),
		).toBe(true);
		expect(
			shouldSkipLegacyModelStreamStageSummary({
				streamDataSources: {
					sourceTypicalTasks: {
						"ui:options": { archComponent: "typicalWork" },
					},
				},
			}),
		).toBe(false);
	});
});
