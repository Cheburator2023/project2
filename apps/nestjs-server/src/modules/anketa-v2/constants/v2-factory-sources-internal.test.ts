import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type CatalogWork = {
	stream: string;
	stage: string;
	name: string;
	component: string;
	norm: number | null;
	triggerRules?: Array<{ paramCode: string; valueLabel?: string | null }>;
	laborCoefficients?: Array<{
		paramCode: string;
		values: Array<{ label: string; coefficient: number }>;
	}>;
	laborArchCounts?: Array<{ kind: string }> | null;
	formulaText?: string;
};

describe("factory sources internal works (CSV 210/211/212)", () => {
	const snapshot = JSON.parse(
		readFileSync(
			join(__dirname, "v2-factory-typical-works.snapshot.json"),
			"utf8",
		),
	) as { typicalWorks: CatalogWork[] };

	const works = snapshot.typicalWorks.filter(
		(row) => row.stream === "Источники данных",
	);

	const byKey = Object.fromEntries(
		works.map((row) => [`${row.stage}|${row.name}`, row]),
	);

	it("keeps 210 formula as sum of replica + clarify + extra-source risk", () => {
		const row =
			byKey[
				"Этап 210|Исследование и описание внутренних источников, выгрузка тестовых данных, мониторинг изменений источников"
			];
		expect(row?.component).toBe("Система-источник");
		expect(row?.norm).toBe(14);
		expect(row?.formulaText).toBe(
			"N × (коэф(field_8pFvwc-v) + коэф(field_xva1dRvW) + коэф(field_whHc-OoW))",
		);
		expect(row?.triggerRules?.[0]).toMatchObject({
			paramCode: "type",
			valueLabel: "Внутренний",
		});
	});

	it("maps process 212 workType Настройка→0.5 (schema label for CSV «Без изменений»)", () => {
		const row =
			byKey[
				"Этап 212|Реализация процесса загрузки внутренних данных в Платформу данных для целей моделирования"
			];
		expect(row?.component).toBe("Процесс обработки данных");
		const workType = row?.laborCoefficients?.find(
			(item) => item.paramCode === "field_yJ51GkCR",
		);
		expect(workType?.values).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: "Настройка", coefficient: 0.5 }),
				expect.objectContaining({ label: "Доработка", coefficient: 0.8 }),
				expect.objectContaining({ label: "Разработка", coefficient: 1 }),
			]),
		);
		expect(row?.formulaText).toBe(
			"N × (коэф(field_yJ51GkCR) + коэф(field_qMxSfHk1))",
		);
		expect(row?.triggerRules?.map((rule) => rule.paramCode).sort()).toEqual([
			"field_x-1d7wUh",
			"type",
		]);
	});

	it("keeps 211 mart clarify as Да/Нет only and sourceSystem arch count", () => {
		const row =
			byKey[
				"Этап 211|Разработка БТ (ТР) на реализацию витрины для внутренних данных"
			];
		const clarify = row?.laborCoefficients?.find(
			(item) => item.paramCode === "field_xva1dRvW",
		);
		expect(clarify?.values).toHaveLength(2);
		expect(clarify?.values.map((value) => value.label).sort()).toEqual([
			"Да",
			"Нет",
		]);
		expect(
			row?.laborArchCounts?.some((item) => item.kind === "sourceSystem"),
		).toBe(true);
	});
});
