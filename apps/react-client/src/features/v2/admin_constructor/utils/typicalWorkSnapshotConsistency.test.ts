import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RJSFSchema } from "@rjsf/utils";
import type { V2LogicGraphDto, V2LogicRuleDto } from "@smart-anketa/api-contract";
import {
	collectGeneratedTypicalWorkArrayPaths,
	collectTypicalWorkBlockBindings,
	patchV2AnketaCalculationLogicRules,
	patchV2TypicalWorksLogicRules,
	readTypicalWorkBoundWorkIdsAtOutputPath,
	resolveStreamExecutorForTypicalWorkOutputPath,
	TYPICAL_WORK_BOUND_WORK_IDS_KEY,
	V2_IMPLEMENTATION_STREAM,
} from "@smart-anketa/api-contract";
import { describe, expect, it } from "vitest";
import { ARCH_COMPONENT_PRESET_DEFS } from "../schemaEditor/archComponentPresets";
import { placeTypicalWorkInStream } from "../schemaEditor/placeTypicalWorkInStream";
import {
	appendBoundWorkIdAtPointer,
	pointerToOutputPath,
	readBoundWorkIdsAtPointer,
} from "../schemaEditor/typicalWorkBlockBinding";
import { coerceUiSchema } from "./coerceV2TemplateSnapshot";

const defaultSnapshotPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../../../../../nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

type TemplateSnapshot = {
	jsonSchema: RJSFSchema;
	uiSchema: Record<string, unknown>;
	logic: V2LogicGraphDto;
};

function loadDefaultSnapshot(): TemplateSnapshot {
	return JSON.parse(readFileSync(defaultSnapshotPath, "utf8")) as TemplateSnapshot;
}

function roundtripUiSchema(
	uiSchema: Record<string, unknown>,
	jsonSchema: RJSFSchema,
): Record<string, unknown> {
	const serialized = JSON.stringify(uiSchema);
	return coerceUiSchema(JSON.parse(serialized), jsonSchema) as Record<
		string,
		unknown
	>;
}

function catalogRulesFingerprint(
	logic: V2LogicGraphDto,
	jsonSchema: RJSFSchema,
	uiSchema: Record<string, unknown>,
): string {
	const patched = patchV2AnketaCalculationLogicRules(logic, {
		jsonSchema,
		uiSchema,
	});
	const catalogRules = patched.rules
		.filter((rule) => rule.id.startsWith("typical-works-catalog-"))
		.map((rule) => ({
			id: rule.id,
			targetPath: rule.targetPath,
			condition: rule.condition,
			allowedWorkIds: (rule.payload as Record<string, unknown> | undefined)
				?.allowedWorkIds,
		}))
		.sort((a, b) => a.id.localeCompare(b.id));
	return JSON.stringify(catalogRules);
}

describe("typicalWork snapshot consistency", () => {
	it("preserves boundWorkIds and streamExecutor through coerceUiSchema roundtrip", () => {
		const jsonSchema: RJSFSchema = {
			type: "object",
			properties: {
				streamDataSources: {
					type: "object",
					properties: {
						field_stream: { type: "object", properties: {} },
						field_tw: { type: "array", items: { type: "object" } },
					},
				},
			},
		};
		const uiSchema: Record<string, unknown> = {
			streamDataSources: {
				field_stream: {
					"ui:options": {
						streamBlock: true,
						streamExecutor: "Источники данных",
					},
				},
				field_tw: {
					"ui:options": {
						archComponent: "typicalWork",
						streamExecutor: "Источники данных",
						[TYPICAL_WORK_BOUND_WORK_IDS_KEY]: ["work-a", "work-b"],
					},
				},
			},
		};

		const roundtripped = roundtripUiSchema(uiSchema, jsonSchema);
		const bindings = collectTypicalWorkBlockBindings(roundtripped);

		expect(bindings).toEqual([
			{
				outputPath: "streamDataSources.field_tw",
				boundWorkIds: ["work-a", "work-b"],
			},
		]);
		expect(
			resolveStreamExecutorForTypicalWorkOutputPath(
				roundtripped,
				"streamDataSources.field_tw",
			),
		).toEqual([V2_IMPLEMENTATION_STREAM.IDSRC]);
	});

	it("keeps patched catalog rules identical before and after coerceUiSchema", () => {
		const logic: V2LogicGraphDto = {
			rules: [
				{
					id: "unified-source-typical-works",
					kind: "task_trigger",
					targetPath: "/streamDataSources/sourceTypicalTasks",
					dependencies: ["/detailInfo/sourceSystems"],
					condition: true,
					payload: { mode: "generated_rows" },
				} as V2LogicRuleDto,
			],
		};
		const jsonSchema: RJSFSchema = {
			type: "object",
			properties: {
				field_a: { type: "array", items: { type: "object" } },
				field_b: { type: "array", items: { type: "object" } },
			},
		};
		const uiSchema: Record<string, unknown> = {
			field_a: {
				"ui:options": {
					archComponent: "typicalWork",
					boundWorkIds: ["work-1"],
				},
			},
			field_b: {
				"ui:options": {
					archComponent: "typicalWork",
					boundWorkIds: ["work-2"],
				},
			},
		};

		const before = catalogRulesFingerprint(logic, jsonSchema, uiSchema);
		const after = catalogRulesFingerprint(
			logic,
			jsonSchema,
			roundtripUiSchema(uiSchema, jsonSchema),
		);
		expect(after).toBe(before);
	});

	it("factory default snapshot: boundWorkIds survive coerceUiSchema", () => {
		const snapshot = loadDefaultSnapshot();
		const uiSchema = roundtripUiSchema(
			snapshot.uiSchema,
			snapshot.jsonSchema,
		);
		const bindings = collectTypicalWorkBlockBindings(uiSchema);

		expect(bindings.length).toBeGreaterThan(0);
		const bound = bindings.filter((b) => (b.boundWorkIds?.length ?? 0) > 0);
		expect(bound.length).toBeGreaterThan(0);

		const patched = patchV2TypicalWorksLogicRules(snapshot.logic, {
			jsonSchema: snapshot.jsonSchema,
			uiSchema,
		});
		const catalogRules = patched.rules.filter((rule) =>
			rule.id.startsWith("typical-works-catalog-"),
		);
		expect(catalogRules.length).toBeGreaterThan(0);
		for (const rule of catalogRules) {
			const payload = rule.payload as Record<string, unknown>;
			const allowed = payload.allowedWorkIds;
			if (Array.isArray(allowed)) {
				expect(allowed.length).toBeGreaterThan(0);
			}
		}
	});

	it("factory default snapshot: typicalWork item fields match constructor preset", () => {
		const snapshot = loadDefaultSnapshot();
		const presetItems = ARCH_COMPONENT_PRESET_DEFS.typicalWork.make()
			.items as RJSFSchema;
		const expectedTitles = Object.fromEntries(
			Object.entries(
				(presetItems.properties ?? {}) as Record<string, RJSFSchema>,
			).map(([key, field]) => [key, field.title]),
		);
		const expectedKeys = Object.keys(expectedTitles).sort();

		const paths = collectGeneratedTypicalWorkArrayPaths(snapshot.uiSchema);
		expect(paths.length).toBeGreaterThan(0);

		for (const path of paths) {
			const segments = path.split(".");
			let node: unknown = snapshot.jsonSchema;
			for (const segment of segments) {
				node = (node as RJSFSchema).properties?.[segment];
			}
			const items = (node as RJSFSchema | undefined)?.items as
				| RJSFSchema
				| undefined;
			const props = (items?.properties ?? {}) as Record<string, RJSFSchema>;
			expect(Object.keys(props).sort()).toEqual(expectedKeys);
			for (const key of expectedKeys) {
				expect(props[key]?.title).toBe(expectedTitles[key]);
			}
			expect(props).not.toHaveProperty("reason");
			expect(props).not.toHaveProperty("workType");
		}
	});

	it("placeTypicalWorkInStream paths match collectTypicalWorkBlockBindings after roundtrip", () => {
		const jsonSchema: RJSFSchema = {
			type: "object",
			properties: {
				detailInfo: {
					type: "object",
					properties: {
						sourceSystems: { type: "array", items: { type: "object" } },
					},
				},
			},
		};
		const uiSchema: Record<string, unknown> = {};

		const placed = placeTypicalWorkInStream(
			jsonSchema,
			uiSchema,
			"Источники данных",
		);
		expect(placed).not.toBeNull();

		let ui = appendBoundWorkIdAtPointer(
			placed!.uiSchema,
			placed!.typicalWorkPointer,
			"work-nested",
			[{ id: "work-nested", streams: ["Источники данных"] }],
			"Источники данных",
		);
		const boundBefore = readBoundWorkIdsAtPointer(
			ui,
			placed!.typicalWorkPointer,
		);
		expect(boundBefore).toEqual(["work-nested"]);

		ui = roundtripUiSchema(ui, placed!.jsonSchema);
		const outputPath = pointerToOutputPath(placed!.typicalWorkPointer);
		expect(readTypicalWorkBoundWorkIdsAtOutputPath(ui, outputPath)).toEqual([
			"work-nested",
		]);
		expect(collectTypicalWorkBlockBindings(ui).map((b) => b.outputPath)).toContain(
			outputPath,
		);
	});
});
