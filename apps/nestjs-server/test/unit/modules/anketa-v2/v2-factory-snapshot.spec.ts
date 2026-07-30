import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	resolveAnketaCalculationLogic,
	stripParamNameSourceKeys,
	stripQuestionnaireCalcNameFromTemplateSnapshot,
	type V2LogicGraphDto,
} from "@smart-anketa/api-contract";
import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-default-template-snapshot";
import { V2_FACTORY_TYPICAL_WORKS_SNAPSHOT } from "../../../../src/modules/anketa-v2/constants/v2-factory-typical-works-catalog";

const snapshotPath = join(
	__dirname,
	"../../../../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

const SOURCE_STREAMS = new Set([
	"Источники данных",
	"ИД. Внутренний",
	"ИД. Внешний",
]);

function laborDisplayName(paramName: string | null | undefined): string {
	return stripParamNameSourceKeys(paramName).trim();
}

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
			(group) =>
				laborDisplayName(group.paramName) ===
				"Требуется хэширование/ шифрование",
		);
		expect(hashing?.values).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: "Да", coefficient: 1.25 }),
				expect.objectContaining({ label: "Нет", coefficient: 0.75 }),
				expect.objectContaining({
					label: "Неизвестно",
					coefficient: 1,
				}),
			]),
		);
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
			(group) =>
				laborDisplayName(group.paramName) ===
				"Требуется хэширование/ шифрование",
		);
		expect(hashing?.values.find((value) => value.label === "Нет")?.coefficient).toBe(
			0.9,
		);
	});

	it("для параметров трудоёмкости формул заданы конечные коэффициенты", () => {
		for (const work of V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks) {
			if (!work.formulaText) continue;
			for (const group of work.laborCoefficients ?? []) {
				if (group.kind === "any_of") {
					expect(group.anyOf).toBeDefined();
					expect(Number.isFinite(group.anyOf?.coeffOn)).toBe(true);
					expect(Number.isFinite(group.anyOf?.coeffOff)).toBe(true);
					continue;
				}
				// overallUncertainty подставляется рантаймом, в snapshot values могут быть пустыми.
				if (
					group.paramCode === "overallUncertainty" ||
					laborDisplayName(group.paramName)
						.toLowerCase()
						.includes("общая неопределённость")
				) {
					continue;
				}
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
					.filter(
						(group) => laborDisplayName(group.paramName) === "Тип работ",
					)
					.map((group) => ({ work, group })),
		);

		expect(bindings.length).toBeGreaterThanOrEqual(20);
		for (const { work, group } of bindings) {
			const labels = group.values.map((value) => value.label);
			expect(labels.length).toBeGreaterThanOrEqual(2);
			expect(labels).toEqual(
				expect.arrayContaining(["Разработка", "Доработка"]),
			);
			if (work.component.includes("Процесс")) {
				expect(group.paramCode).toBe("field_yJ51GkCR");
				expect(work.formulaText ?? "").toContain("коэф(field_yJ51GkCR)");
			} else {
				expect(group.paramCode).toBe("workType");
				expect(work.formulaText ?? "").toContain("коэф(workType)");
			}
		}
	});

	it("внутренние источники 210–212: нормы и триггеры после publish из admin export", () => {
		const byName = (fragment: string) =>
			V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks.find(
				(row) =>
					SOURCE_STREAMS.has(row.stream) &&
					row.name.includes(fragment),
			);

		const stage210 = byName(
			"Исследование и описание внутренних источников",
		);
		expect(stage210?.stream).toBe("Источники данных");
		expect(stage210?.norm).toBe(14);
		expect(stage210?.triggerRules).toEqual([
			expect.objectContaining({
				paramCode: "type",
				values: ["Внутренний"],
				valueCode: "внутренний",
				valueLabel: "Внутренний",
			}),
		]);

		const stage211Process = byName(
			"процесса загрузки данных для внутренних",
		);
		expect(stage211Process?.norm).toBe(22);
		expect(
			stage211Process?.laborCoefficients?.some(
				(g) => laborDisplayName(g.paramName) === "Сложность реализации",
			),
		).toBe(true);

		const stage211Vitrina = byName("витрины для внутренних данных");
		expect(stage211Vitrina?.norm).toBe(22);
		const clarify = stage211Vitrina?.laborCoefficients?.find((g) =>
			laborDisplayName(g.paramName).includes("уточнение требований"),
		);
		expect(clarify?.values.map((v) => v.label)).toEqual(["Да", "Нет"]);
		expect(clarify?.values.map((v) => v.coefficient)).toEqual([10, 1]);

		const stage212Process = byName(
			"процесса загрузки внутренних данных",
		);
		expect(stage212Process?.norm).toBe(22);
		expect(stage212Process?.stream).toBe("Источники данных");
		expect(stage212Process?.triggerRules).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					paramCode: "type",
					values: ["Внутренний"],
					valueCode: "внутренний",
				}),
				expect.objectContaining({
					values: ["Да"],
					valueCode: "true",
				}),
			]),
		);
		const processWorkType = stage212Process?.laborCoefficients?.find(
			(g) => laborDisplayName(g.paramName) === "Тип работ",
		);
		expect(processWorkType?.paramCode).toBe("field_yJ51GkCR");
		expect(processWorkType?.values.map((v) => v.label).sort()).toEqual([
			"Доработка",
			"Разработка",
		]);

		const stage212Vitrina = byName("витрины внутренних данных");
		const vitrinaWorkType = stage212Vitrina?.laborCoefficients?.find(
			(g) => laborDisplayName(g.paramName) === "Тип работ",
		);
		expect(vitrinaWorkType?.values).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: "Разработка", coefficient: 1 }),
				expect.objectContaining({ label: "Доработка", coefficient: 1 }),
				expect.objectContaining({ label: "Настройка", coefficient: 1 }),
			]),
		);
	});

	it("dictionariesSnapshot из v35", () => {
		expect(file.dictionariesSnapshot?.referencedDictionaryCodes?.length).toBe(
			67,
		);
		expect(
			file.dictionariesSnapshot?.referencedDictionaryCodes,
		).not.toEqual(
			expect.arrayContaining([
				"v2.method.21.сроки_инициативы",
				"v2.method.22.стоимость_инициативы",
			]),
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
				paramName: expect.stringContaining("Необходимость пилота (MVP)"),
				operator: "=",
				values: ["Да"],
				paramCode: "field_o_HRj6VO",
				valueCode: "true",
				valueLabel: "Да",
			}),
		]);
	});

	it("модельный стрим 07: формула с prePromEval, без «Поддержка пилота»", () => {
		const work = V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks.find(
			(row) =>
				row.stream === "Модельный стрим" &&
				row.stage === "07" &&
				row.name === "Разработка витрины для применения модели",
		);
		expect(work?.triggerMode).toBe("formula");
		expect(work?.triggerFormula?.text).toContain(
			"Необходимость поддержки проведения пилота",
		);
		expect(work?.triggerFormula?.text).not.toContain("Поддержка пилота =");
		expect(work?.triggerFormula?.tokens).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: "param",
					paramCode: "prePromEval",
				}),
				expect.objectContaining({
					kind: "param",
					paramCode: "productionAdditionalReports",
					operator: "!=",
				}),
			]),
		);
	});
});
