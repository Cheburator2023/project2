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
		const workType = (schema.properties as Record<string, RJSFSchema>)
			.generalInfo!.properties!.modelService!.properties!.workType as RJSFSchema;
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
});
