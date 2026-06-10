import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildBooleanVisibilityRule } from "@smart-anketa/api-contract";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { readUiSchemaBranchAtPointer } from "./schemaMutators";
import { derivePreviewSchemas } from "./logicPreview";

const snapshotPath = join(
	import.meta.dirname,
	"../../../../../../nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
};

const streamNamesVisibilityRule = buildBooleanVisibilityRule({
	id: "test-stream-names",
	targetPointer: "/detailInfo/parameters/streamNames",
	sourcePointer: "/detailInfo/parameters/streamsOutsideDADM",
});

describe("logicPreview visibility", () => {
	it("hides streamNames when streamsOutsideDADM is false", () => {
		const { previewUiSchema } = derivePreviewSchemas(
			snapshot.jsonSchema,
			snapshot.uiSchema,
			[streamNamesVisibilityRule],
			{
				detailInfo: {
					parameters: { streamsOutsideDADM: false, streamNames: "" },
				},
			},
		);

		const branch = readUiSchemaBranchAtPointer(
			previewUiSchema as Record<string, unknown>,
			"/detailInfo/parameters/streamNames",
		);
		expect(branch?.["ui:hidden"]).toBe(true);
	});

	it("shows streamNames when streamsOutsideDADM is true", () => {
		const { previewUiSchema } = derivePreviewSchemas(
			snapshot.jsonSchema,
			snapshot.uiSchema,
			[streamNamesVisibilityRule],
			{
				detailInfo: {
					parameters: {
						streamsOutsideDADM: true,
						streamNames: "Stream A",
					},
				},
			},
		);

		const branch = readUiSchemaBranchAtPointer(
			previewUiSchema as Record<string, unknown>,
			"/detailInfo/parameters/streamNames",
		);
		expect(branch?.["ui:hidden"]).toBeUndefined();
	});
});
