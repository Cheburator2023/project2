import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	resolveAnketaCalculationLogic,
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

	it("runtime snapshot совпадает с файлом (v35 as-is, logic запечён в JSON)", () => {
		const stripped = stripQuestionnaireCalcNameFromTemplateSnapshot({
			jsonSchema: stripDraft07Schema(file.jsonSchema),
			uiSchema: file.uiSchema,
		});
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.jsonSchema).toEqual(stripped.jsonSchema);
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.uiSchema).toEqual(stripped.uiSchema);
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.logic).toEqual(file.logic);
		expect(V2_DEFAULT_TEMPLATE_SNAPSHOT.dictionariesSnapshot).toEqual(
			file.dictionariesSnapshot ?? {
				referencedDictionaryCodes: expect.any(Array),
			},
		);
	});

	it("logic содержит правила типовых работ", () => {
		expect(Array.isArray(file.logic.rules)).toBe(true);
		expect(file.logic.rules?.length).toBeGreaterThanOrEqual(18);
		expect(
			file.logic.rules?.some((rule) =>
				rule.id.startsWith("typical-works-catalog-"),
			),
		).toBe(true);
		expect(file.logic.rules?.some((rule) => rule.id === "unified-typical-total")).toBe(
			true,
		);
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

		expect(bindings).toHaveLength(25);
		for (const { work, group } of bindings) {
			const labels = group.values.map((value) => value.label);
			const isInternal212Process =
				work.stream === "ИД. Внутренний" &&
				work.stage === "Этап 212" &&
				work.component.includes("Процесс");
			const isInternal212Vitrina =
				work.stream === "ИД. Внутренний" &&
				work.stage === "Этап 212" &&
				work.component.includes("Объект");

			if (isInternal212Process) {
				// CSV etalon: «Без изменений» вместо «Настройка»
				expect(labels).toEqual([
					"Разработка",
					"Доработка",
					"Без изменений",
				]);
			} else {
				expect(labels).toEqual([
					"Разработка",
					"Доработка",
					"Настройка",
				]);
			}
			if (isInternal212Vitrina) {
				// CSV: все типы работ ×1
				expect(group.values.map((value) => value.coefficient)).toEqual([
					1, 1, 1,
				]);
			}
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

	it("внутренние источники 210–212: нормы и триггеры по CSV-эталону", () => {
		const byName = (fragment: string) =>
			V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks.find(
				(row) =>
					row.stream === "ИД. Внутренний" &&
					row.name.includes(fragment),
			);

		const stage210 = byName(
			"Исследование и описание внутренних источников",
		);
		expect(stage210?.norm).toBe(14);
		expect(stage210?.triggerRules).toEqual([
			expect.objectContaining({
				paramCode: "type",
				values: ["Внутренний"],
			}),
		]);

		const stage211Process = byName(
			"процесса загрузки данных для внутренних",
		);
		expect(stage211Process?.norm).toBe(22);
		expect(
			stage211Process?.laborCoefficients?.some(
				(g) => g.paramName === "Сложность реализации",
			),
		).toBe(true);

		const stage211Vitrina = byName("витрины для внутренних данных");
		expect(stage211Vitrina?.norm).toBe(22);
		const clarify = stage211Vitrina?.laborCoefficients?.find((g) =>
			g.paramName.includes("уточнение требований"),
		);
		expect(clarify?.values.map((v) => v.label)).toEqual(["Да", "Нет"]);
		expect(clarify?.values.map((v) => v.coefficient)).toEqual([10, 1]);

		const stage212Process = byName(
			"процесса загрузки внутренних данных",
		);
		expect(stage212Process?.norm).toBe(22);
		expect(stage212Process?.triggerRules).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					paramCode: "type",
					values: ["Внутренний"],
				}),
				expect.objectContaining({
					values: ["Да"],
				}),
			]),
		);
		const processWorkType = stage212Process?.laborCoefficients?.find(
			(g) => g.paramName === "Тип работ",
		);
		expect(processWorkType?.values).toEqual([
			{ label: "Разработка", coefficient: 1 },
			{ label: "Доработка", coefficient: 0.8 },
			{ label: "Без изменений", coefficient: 0.5 },
		]);

		const stage212Vitrina = byName("витрины внутренних данных");
		const vitrinaWorkType = stage212Vitrina?.laborCoefficients?.find(
			(g) => g.paramName === "Тип работ",
		);
		expect(vitrinaWorkType?.values).toEqual([
			{ label: "Разработка", coefficient: 1 },
			{ label: "Доработка", coefficient: 1 },
			{ label: "Настройка", coefficient: 1 },
		]);
	});

	it("dictionariesSnapshot из v35", () => {
		expect(file.dictionariesSnapshot?.referencedDictionaryCodes?.length).toBe(
			70,
		);
	});

	it("модельный стрим 05A: триггер MVP = Да из «Результат выбора»", () => {
		const work = V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks.find(
			(row) =>
				row.stream === "Модельный стрим" &&
				row.stage === "05A" &&
				row.name === "Разработка пилотной модели (MVP)",
		);
		expect(work?.triggerRules).toEqual([
			expect.objectContaining({
				paramName: "Необходимость пилота (MVP)",
				operator: "=",
				values: ["Да"],
				paramCode: "field_o_HRj6VO",
				valueCode: "true",
				valueLabel: "Да",
			}),
		]);
	});
});
