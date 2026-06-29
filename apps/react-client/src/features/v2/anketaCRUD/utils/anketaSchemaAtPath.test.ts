import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { setUiHiddenAtPointer } from "@react-client/features/v2/admin_constructor/utils/schemaMutators";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	getArrayItemSchemaSliceForModal,
	getObjectSchemaSliceForModal,
} from "./anketaSchemaAtPath";

const snapshotPath = join(
	import.meta.dirname,
	"../../../../../../nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
};

describe("anketaSchemaAtPath modal slices", () => {
	it("reads object modal fields with titles from jsonSchema", () => {
		const slice = getObjectSchemaSliceForModal(
			snapshot.jsonSchema,
			snapshot.uiSchema,
			"generalInfo.modelService",
		);
		expect(slice?.schema.properties?.workType).toMatchObject({
			title: "Тип работ",
		});
	});

	it("reflects title changes from editor jsonSchema", () => {
		const schema = structuredClone(snapshot.jsonSchema);
		const workType = (
			(
				(schema.properties as Record<string, RJSFSchema>).generalInfo!
					.properties as Record<string, RJSFSchema>
			).modelService!.properties as Record<string, RJSFSchema>
		).workType as RJSFSchema;
		workType.title = "Новый тип работ";

		const slice = getObjectSchemaSliceForModal(
			schema,
			snapshot.uiSchema,
			"generalInfo.modelService",
		);
		expect(slice?.schema.properties?.workType).toMatchObject({
			title: "Новый тип работ",
		});
	});

	it("omits fields marked hidden in uiSchema", () => {
		const ui = setUiHiddenAtPointer(
			structuredClone(snapshot.uiSchema) as Record<string, unknown>,
			"/generalInfo/modelService/workType",
			true,
		) as UiSchema;

		const slice = getObjectSchemaSliceForModal(
			snapshot.jsonSchema,
			ui,
			"generalInfo.modelService",
		);
		expect(slice?.schema.properties?.workType).toBeUndefined();
	});

	it("reads array item modal fields from schema", () => {
		const slice = getArrayItemSchemaSliceForModal(
			snapshot.jsonSchema,
			snapshot.uiSchema,
			"detailInfo.sourceSystems",
		);
		expect(slice?.schema.properties?.name).toBeDefined();
	});

	it("follows ui:order when it differs from jsonSchema property order", () => {
		const ui = structuredClone(snapshot.uiSchema) as UiSchema;
		const modelServiceUi = (
			(ui as Record<string, unknown>).generalInfo as Record<string, unknown>
		).modelService as Record<string, unknown>;
		modelServiceUi["ui:order"] = [
			"workType",
			"modelClass",
			"field_dEVFQVQn",
			"field_jUm5syZf",
			"field_SvNx6iEq",
			"field_o_HRj6VO",
			"prePromEval",
			"pkRegulatory",
			"field_imxB4YEd",
			"field_kkbRs50S",
			"field_r66ph-79",
			"field_Y2S_XRAQ",
			"field_JcKtx9Mg",
			"field_KzzDtkB0",
			"field_F7nK-We5",
			"field_4IL7OStC",
		];

		const slice = getObjectSchemaSliceForModal(
			snapshot.jsonSchema,
			ui,
			"generalInfo.modelService",
		);

		expect(Object.keys(slice!.schema.properties!).slice(0, 2)).toEqual([
			"workType",
			"modelClass",
		]);
	});

	it("preserves ui:order in object modal slice", () => {
		const expectedOrder = (
			(snapshot.uiSchema as Record<string, unknown>).generalInfo as Record<
				string,
				unknown
			>
		).modelService as Record<string, unknown>;
		const uiOrder = expectedOrder["ui:order"] as string[];

		const slice = getObjectSchemaSliceForModal(
			snapshot.jsonSchema,
			snapshot.uiSchema,
			"generalInfo.modelService",
		);

		expect(Object.keys(slice!.schema.properties!)).toEqual(uiOrder);
		expect((slice!.uiSchema as Record<string, unknown>)["ui:order"]).toEqual(
			uiOrder,
		);
	});

	it("drops hidden keys from ui:order in modal slice", () => {
		const ui = setUiHiddenAtPointer(
			structuredClone(snapshot.uiSchema) as Record<string, unknown>,
			"/generalInfo/modelService/workType",
			true,
		) as UiSchema;

		const slice = getObjectSchemaSliceForModal(
			snapshot.jsonSchema,
			ui,
			"generalInfo.modelService",
		);
		const order = (slice!.uiSchema as Record<string, unknown>)[
			"ui:order"
		] as string[];

		expect(order).not.toContain("workType");
		expect(Object.keys(slice!.schema.properties!)).toEqual(order);
	});
});
