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
			expect.arrayContaining(["workflow", "meta", "uncertaintyCalculation", "summary"]),
		);
		expect(bindings.hiddenRootKeys).toEqual(
			expect.arrayContaining(["workflow", "meta"]),
		);

		expect(bindings.modalArrayPaths).toEqual(
			expect.arrayContaining([
				"detailInfo.sourceSystems",
				"detailInfo.model.modelsList",
				"detailInfo.detailAtypicalTasks",
				"streamDataSources.atypicalTasks",
				"streamModelControl.atypicalTasks",
			]),
		);

		expect(bindings.readonlyArrayTablePaths).toEqual(
			expect.arrayContaining([
				"detailInfo.detailTypicalTasks",
				"streamDataSources.sourceTypicalTasks",
				"generalInfo.modelService.controlTypicalTasks",
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

	it("marks system roots and uncertainty modal widget in default snapshot", () => {
		expect(
			resolveV2AnketaCanvasUiKind(snapshot.uiSchema.uncertaintyCalculation),
		).toBe("system");
		expect(
			resolveV2AnketaCanvasUiKind(
				(snapshot.uiSchema.generalInfo as Record<string, unknown>)
					.overallUncertaintyModal,
			),
		).toBeNull();
		expect(schemaHasUncertaintyModalWidget(snapshot.uiSchema)).toBe(true);
	});
});
