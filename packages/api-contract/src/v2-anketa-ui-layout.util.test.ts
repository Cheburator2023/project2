import { describe, expect, it } from "vitest";
import { enrichAnketaLayoutUiSchema } from "./v2-anketa-ui-layout.util";
import { readV2AnketaSectionUiOptions } from "./v2-anketa-section-ui.util";

describe("enrichAnketaLayoutUiSchema", () => {
	it("strips misassigned workflowSectionId from custom stream blocks", () => {
		const jsonSchema = {
			type: "object",
			properties: {
				field_aJEu5ziT: {
					type: "object",
					properties: {},
				},
			},
		};
		const uiSchema = {
			field_aJEu5ziT: {
				"ui:options": {
					streamBlock: true,
					streamExecutor: "ПиРМ",
					workflowSectionId: "streamDataSources",
				},
			},
		};

		const enriched = enrichAnketaLayoutUiSchema(
			uiSchema,
			jsonSchema as never,
		) as Record<string, unknown>;
		const opts = (
			(enriched.field_aJEu5ziT as Record<string, unknown>)?.[
				"ui:options"
			] as Record<string, unknown> | undefined
		);

		expect(opts?.workflowSectionId).toBeUndefined();
		expect(opts?.streamExecutor).toBe("pirm");
		expect(opts?.groupActivatable).toBeUndefined();
	});

	it("soft-syncs activation toggle for Sources and Model Control streams", () => {
		const jsonSchema = {
			type: "object",
			properties: {
				streamDataSources: { type: "object", properties: {} },
				streamModelControl: { type: "object", properties: {} },
				field_i8dL7QZa: { type: "object", properties: {} },
			},
		};
		const uiSchema = {
			streamDataSources: {
				"ui:options": { streamBlock: true, streamExecutor: "idsrc" },
			},
			streamModelControl: {
				"ui:options": { streamBlock: true, streamExecutor: "mdlctl" },
			},
			field_i8dL7QZa: {
				"ui:options": { streamBlock: true, streamExecutor: "dadm" },
			},
		};

		const enriched = enrichAnketaLayoutUiSchema(
			uiSchema,
			jsonSchema as never,
		) as Record<string, unknown>;

		const sources = readV2AnketaSectionUiOptions(enriched.streamDataSources);
		expect(sources.groupActivatable).toBe(true);
		expect(sources.groupActive).toBe(false);

		const control = readV2AnketaSectionUiOptions(enriched.streamModelControl);
		expect(control.groupActivatable).toBe(true);
		expect(control.groupActive).toBe(false);

		const dadm = readV2AnketaSectionUiOptions(enriched.field_i8dL7QZa);
		expect(dadm.groupActivatable).toBeUndefined();
	});

	it("does not override existing groupActivatable on optional streams", () => {
		const jsonSchema = {
			type: "object",
			properties: {
				streamDataSources: { type: "object", properties: {} },
			},
		};
		const uiSchema = {
			streamDataSources: {
				"ui:options": {
					streamBlock: true,
					streamExecutor: "idsrc",
					groupActivatable: true,
					groupActive: true,
				},
			},
		};
		const enriched = enrichAnketaLayoutUiSchema(
			uiSchema,
			jsonSchema as never,
		) as Record<string, unknown>;
		const opts = readV2AnketaSectionUiOptions(enriched.streamDataSources);
		expect(opts.groupActivatable).toBe(true);
		expect(opts.groupActive).toBe(true);
	});
});
