import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	patchV2AnketaCalculationLogicRules,
	stripQuestionnaireCalcNameFromTemplateSnapshot,
	type V2LogicGraphDto,
} from "@smart-anketa/api-contract";
import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-default-template-snapshot";
import { V2_FACTORY_TYPICAL_WORKS_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-factory-typical-works-catalog";

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

	it("содержит коэффициенты трудоёмкости Этапа 220 из методологии", () => {
		const work = V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks.find(
			(row) =>
				row.stage === "Этап 220" &&
				row.name === "Проведение ИФТ Решения",
		);
		expect(work).toBeDefined();
		const hashing = work?.laborCoefficients?.find(
			(group) => group.paramName === "Требуется хэширование/ шифрование",
		);
		expect(hashing?.values).toEqual([
			{ label: "Да", coefficient: 1.25 },
			{ label: "Нет", coefficient: 0.75 },
			{ label: "Неизвестно", coefficient: 1 },
		]);
	});

	it("учитывает компонентное исключение для хэширования системы-источника", () => {
		const work = V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks.find(
			(row) =>
				row.component === "Система-источник" &&
				row.stage === "Этап 215" &&
				row.name ===
					"Интервьюирование заказчика, подтверждение финансирования и обработка RDS",
		);
		const hashing = work?.laborCoefficients?.find(
			(group) => group.paramName === "Требуется хэширование/ шифрование",
		);
		expect(hashing?.values.find((value) => value.label === "Нет")?.coefficient).toBe(
			0.9,
		);
	});

	it("для параметров трудоёмкости формул заданы конечные коэффициенты", () => {
		for (const work of V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks) {
			if (!work.formulaText) continue;
			for (const group of work.laborCoefficients ?? []) {
				expect(group.values.length).toBeGreaterThan(0);
				for (const value of group.values) {
					expect(Number.isFinite(value.coefficient)).toBe(true);
				}
			}
		}
	});

	it("статически связывает «Тип работ» со справочником по набору значений", () => {
		const bindings = V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks.flatMap(
			(work) =>
				(work.laborCoefficients ?? [])
					.filter((group) => group.paramName === "Тип работ")
					.map((group) => ({ work, group })),
		);

		expect(bindings).toHaveLength(24);
		for (const { work, group } of bindings) {
			expect(group.values.map((value) => value.label)).toEqual([
				"Разработка",
				"Доработка",
				"Настройка",
			]);
			if (work.component.includes("Процесс")) {
				expect(group).toMatchObject({
					paramCode: "field_yJ51GkCR",
					schemaFieldUid: "field_68f5a4fa-579f-4b89-b4f3-11214957dffe",
				});
				expect(work.formulaText).toContain("коэф(field_yJ51GkCR)");
			} else {
				expect(group).toMatchObject({
					paramCode: "workType",
					schemaFieldUid: "field_6f91d0c5-3949-4468-88e9-29741af2b07d",
				});
				expect(work.formulaText).toContain("коэф(workType)");
			}
		}
	});

	it("dictionariesSnapshot из v35", () => {
		expect(file.dictionariesSnapshot?.referencedDictionaryCodes?.length).toBe(
			69,
		);
	});
});
