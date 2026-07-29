import { describe, expect, it } from "vitest";
import {
	formDataWithSingleArchInstance,
	formatEmptyArchInstanceBreakdown,
	formatPerInstanceBreakdownExpanded,
	listArchComponentInstances,
	readPerInstanceArchCountOverride,
	resolveArchComponentKindFromType,
	resolveArchInstanceNameFieldKeys,
	withPerInstanceArchCountOverride,
} from "./v2-typical-work-per-instance.util";
import { resolveWorkArchComponentCount } from "./v2-work-arch-count-coeff.util";

describe("v2-typical-work-per-instance", () => {
	it("maps arch component type labels to kinds", () => {
		expect(resolveArchComponentKindFromType("Модель")).toBe("model");
		expect(resolveArchComponentKindFromType("Модели")).toBe("model");
		expect(resolveArchComponentKindFromType("Система-источник")).toBe(
			"sourceSystem",
		);
		expect(resolveArchComponentKindFromType("Объект / Витрина данных")).toBe(
			"dataMart",
		);
		expect(resolveArchComponentKindFromType("Процесс обработки данных")).toBe(
			"dataProcess",
		);
		expect(resolveArchComponentKindFromType("Модельный сервис")).toBe(
			"modelService",
		);
	});

	it("lists model instances from modelsList", () => {
		const formData = {
			detailInfo: {
				modelsList: [
					{ name: "вава", readyPromReports: true },
					{ name: "вавыаы" },
					{ name: "выавыавы", readyPromReports: false },
				],
			},
		};
		const instances = listArchComponentInstances(formData, "Модель");
		expect(instances).toHaveLength(3);
		expect(instances.map((row) => row.sourceLabel)).toEqual([
			"вава",
			"вавыаы",
			"выавыавы",
		]);
		expect(instances[0]?.row.readyPromReports).toBe(true);
		expect(instances[2]?.row.readyPromReports).toBe(false);
	});

	it("uses factory field key for model name (not generic Модель N)", () => {
		const formData = {
			detailInfo: {
				modelsList: [
					{ "field_atxiq-UM": "ывыфв", workType: "Обучение" },
					{ "field_atxiq-UM": "ыфсфыв", readyPromReports: true },
				],
			},
		};
		const instances = listArchComponentInstances(formData, "Модель");
		expect(instances.map((row) => row.sourceLabel)).toEqual([
			"ывыфв",
			"ыфсфыв",
		]);
	});

	it("resolves model name from schemaParams title Название модели", () => {
		const formData = {
			detailInfo: {
				modelsList: [
					{ "field_customName": "Альфа", workType: "Обучение" },
					{ "field_customName": "Бета" },
				],
			},
		};
		const instances = listArchComponentInstances(formData, "Модель", {
			schemaParams: [
				{
					code: "field_customName",
					name: "Название модели",
					archComponent: "Модель",
				},
				{
					code: "workType",
					name: "Тип работ",
					archComponent: "Модель",
					values: [{ code: "Обучение", label: "Обучение" }],
				},
			],
		});
		expect(instances.map((row) => row.sourceLabel)).toEqual(["Альфа", "Бета"]);
	});

	it("resolves model name by title when schemaParams lack archComponent", () => {
		const instances = listArchComponentInstances(
			{
				detailInfo: {
					modelsList: [{ "field_xyz": "Гамма", workType: "Обучение" }],
				},
			},
			"Модель",
			{
				schemaParams: [
					{ code: "field_xyz", name: "Название модели" },
					{
						code: "workType",
						name: "Тип работ",
						values: [{ code: "Обучение", label: "Обучение" }],
					},
				],
			},
		);
		expect(instances.map((row) => row.sourceLabel)).toEqual(["Гамма"]);
	});

	it("matches Cyrillic title Название модели via schemaParams (no JS \\\\b)", () => {
		expect(
			resolveArchInstanceNameFieldKeys(
				[{ code: "field_atxiq-UM", name: "Название модели" }],
				"model",
			),
		).toEqual(["field_atxiq-UM"]);
	});

	it("uses factory field key for dataMart / dataProcess names", () => {
		expect(
			listArchComponentInstances(
				{
					detailInfo: {
						dataMart: [{ "field_zApubb5V": "Витрина X", workType: "Новый" }],
					},
				},
				"Объект / Витрина данных",
			).map((row) => row.sourceLabel),
		).toEqual(["Витрина X"]);

		expect(
			listArchComponentInstances(
				{
					detailInfo: {
						dataProcess: [{ "field_It-B8PfV": "ETL-1" }],
					},
				},
				"Процесс обработки данных",
			).map((row) => row.sourceLabel),
		).toEqual(["ETL-1"]);
	});

	it("does not fan-out modelService", () => {
		const formData = {
			generalInfo: {
				modelService: [{ name: "A" }, { name: "B" }],
			},
		};
		const instances = listArchComponentInstances(formData, "Модельный сервис");
		expect(instances).toHaveLength(1);
		expect(instances[0]?.sourceLabel).toBe("Контекст");
	});

	it("returns empty list when models are missing", () => {
		expect(listArchComponentInstances({}, "Модель")).toEqual([]);
	});

	it("lists filled source systems", () => {
		const formData = {
			detailInfo: {
				sourceSystems: [
					{ name: "S1", type: "Внутренний" },
					{ name: "", type: "" },
					{ name: "S2", field_x: true },
				],
			},
		};
		const instances = listArchComponentInstances(formData, "Система-источник");
		expect(instances.map((row) => row.sourceLabel)).toEqual(["S1", "S2"]);
	});

	it("forces arch_count override to 1 for per-instance kind", () => {
		const formData = {
			detailInfo: {
				modelsList: [{ name: "A" }, { name: "B" }, { name: "C" }],
			},
		};
		expect(resolveWorkArchComponentCount(formData, "model")).toBe(3);
		const forced = withPerInstanceArchCountOverride(formData, "model", 1);
		expect(resolveWorkArchComponentCount(forced, "model")).toBe(1);
		expect(readPerInstanceArchCountOverride(forced, "model")).toBe(1);
		expect(resolveWorkArchComponentCount(forced, "sourceSystem")).toBe(0);
	});

	it("slices formData to a single model instance for labor lookup", () => {
		const formData = {
			detailInfo: {
				modelsList: [
					{ name: "вава", readyPromReports: true },
					{ name: "выавыавы", readyPromReports: false },
				],
			},
		};
		const instances = listArchComponentInstances(formData, "Модель");
		const sliced = formDataWithSingleArchInstance(
			formData,
			"model",
			instances[0]!,
		);
		const detail = sliced.detailInfo as Record<string, unknown>;
		expect(detail.modelsList).toEqual([
			{ name: "вава", readyPromReports: true },
		]);
		expect(resolveWorkArchComponentCount(sliced, "model")).toBe(1);
	});

	it("formats per-instance expanded sum", () => {
		expect(
			formatPerInstanceBreakdownExpanded(
				[
					{
						sourceLabel: "вава",
						index: 0,
						expanded: "33 × 0.5 = 16.5",
						total: 16.5,
					},
					{
						sourceLabel: "выавыавы",
						index: 1,
						expanded: "33 × 1 = 33",
						total: 33,
					},
				],
				49.5,
			),
		).toBe("16.5 (вава) + 33 (выавыавы) = 49.5");
	});

	it("explains empty arch instances in breakdown", () => {
		expect(formatEmptyArchInstanceBreakdown("Процесс обработки данных")).toBe(
			"нет заполненных «Процесс обработки данных» → 0",
		);
		expect(formatEmptyArchInstanceBreakdown("Система-источник")).toBe(
			"нет заполненных «Система-источник» → 0",
		);
	});
});
