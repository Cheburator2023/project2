import {
	listV2AnketaHiddenRootKeys,
	resolveV2AnketaCanvasUiKind,
	resolveV2AnketaEditorBindings,
	schemaHasUncertaintyModalWidget,
} from "@smart-anketa/api-contract";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("resolveV2AnketaEditorBindings", () => {
	const snapshotPath = join(
		__dirname,
		"../../../../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
	);
	const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
		jsonSchema: Record<string, unknown>;
		uiSchema: Record<string, unknown>;
	};

	it("derives hidden roots and modal paths from default snapshot uiSchema", () => {
		const bindings = resolveV2AnketaEditorBindings(
			snapshot.jsonSchema,
			snapshot.uiSchema,
		);

		expect(listV2AnketaHiddenRootKeys(snapshot.uiSchema)).toEqual(
			expect.arrayContaining([
				"workflow",
				"meta",
				"uncertaintyCalculation",
				"summary",
				"groupActivation",
			]),
		);
		expect(bindings.hiddenRootKeys).toEqual(
			expect.arrayContaining(["workflow", "meta"]),
		);

		expect(bindings.modalArrayPaths).toEqual(
			expect.arrayContaining([
				"detailInfo.sourceSystems",
				"detailInfo.modelsList",
				"streamDataSources.field_eCyDEFw3",
				"streamModelControl.field_hQeUoQl4",
			]),
		);

		expect(bindings.readonlyArrayTablePaths).toEqual(
			expect.arrayContaining([
				"detailInfo.detailTypicalTasks",
				"streamDataSources.field_u-7AkDrP",
			]),
		);

		expect(bindings.modalObjectPaths).toEqual(
			expect.arrayContaining([
				"generalInfo.modelService",
				"detailInfo.dataProcess",
				"detailInfo.dataMart",
			]),
		);

		expect(bindings.modalKindByPath["detailInfo.sourceSystems"]).toBe(
			"rjsfObject",
		);
		expect(bindings.modalKindByPath["generalInfo.modelService"]).toBe(
			"rjsfObject",
		);
		expect(bindings.bodyHiddenDotPaths).toEqual(
			expect.arrayContaining(["generalInfo.modelService.workType"]),
		);
	});

	it("marks uncertainty section as system in factory default snapshot", () => {
		expect(
			resolveV2AnketaCanvasUiKind(snapshot.uiSchema.uncertaintyCalculation, {
				fieldPointer: "/uncertaintyCalculation",
			}),
		).toBe("system");
		expect(schemaHasUncertaintyModalWidget(snapshot.uiSchema)).toBe(true);
	});
});
