import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	patchV2AnketaCalculationLogicRules,
	stripQuestionnaireCalcNameFromTemplateSnapshot,
	type V2LogicGraphDto,
} from "@smart-anketa/api-contract";
import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-default-template-snapshot";

const snapshotPath = join(
	__dirname,
	"../../../../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

function stripDraft07Schema(schema: Record<string, unknown>) {
	const { $schema: _omit, ...rest } = schema;
	return rest;
}

describe("v2 factory snapshot", () => {
	const file = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
		jsonSchema: Record<string, unknown>;
		uiSchema: Record<string, unknown>;
		logic: V2LogicGraphDto;
		dictionariesSnapshot?: { referencedDictionaryCodes?: string[] };
	};

	it("содержит базовые секции анкеты", () => {
		for (const key of [
			"meta",
			"workflow",
			"summary",
			"detailInfo",
			"generalInfo",
			"streamDataSources",
		]) {
			expect(file.jsonSchema.properties).toHaveProperty(key);
		}
	});

	it("runtime snapshot совпадает с файлом (v35 as-is)", () => {
		const stripped = stripQuestionnaireCalcNameFromTemplateSnapshot({
			jsonSchema: stripDraft07Schema(file.jsonSchema),
			uiSchema: file.uiSchema,
		});
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema).toEqual(stripped.jsonSchema);
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema).toEqual(stripped.uiSchema);
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic).toEqual(
			patchV2AnketaCalculationLogicRules(file.logic, {
				jsonSchema: stripped.jsonSchema,
				uiSchema: stripped.uiSchema,
			}),
		);
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.dictionariesSnapshot).toEqual(
			file.dictionariesSnapshot ?? {
				referencedDictionaryCodes: expect.any(Array),
			},
		);
	});

	it("logic содержит правила типовых работ", () => {
		expect(Array.isArray(file.logic.rules)).toBe(true);
		expect(file.logic.rules?.length).toBeGreaterThan(0);
	});

	it("не содержит корневой паразитный блок нетиповых работ", () => {
		expect(file.jsonSchema.properties).not.toHaveProperty("field_V6wVCAX9");
		expect(file.uiSchema).not.toHaveProperty("field_V6wVCAX9");
		expect((file.uiSchema["ui:order"] as string[]) ?? []).not.toContain(
			"field_V6wVCAX9",
		);
	});

	it("содержит исправленный справочник режима обмена данными", () => {
		const sourceFields = (
			file.jsonSchema as {
				properties: {
					detailInfo: {
						properties: {
							sourceSystems: {
								items: { properties: Record<string, { enum?: string[] }> };
							};
						};
					};
				};
			}
		).properties.detailInfo.properties.sourceSystems.items.properties;
		expect(sourceFields.field_9BXQE8SI?.enum).toEqual([
			"Односторонний",
			"Двусторонний",
			"Неизвестно",
		]);
	});

	it("dictionariesSnapshot из v35", () => {
		expect(file.dictionariesSnapshot?.referencedDictionaryCodes?.length).toBe(
			69,
		);
	});
});
