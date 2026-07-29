import { V2_MODEL_STREAM_REGISTRY_STREAM_NAMES } from "@smart-anketa/api-contract";
import {
	extractWorkStage,
	findCatalogFormulaForStream,
	findCatalogRowsForRegistryWork,
	groupCatalogWorks,
	resolveCatalogApplyStreams,
} from "../../../../src/modules/anketa-v2/utils/v2-typical-work-catalog.util";

describe("v2-typical-work-catalog util", () => {
	it("extracts a normalized stage from factory work names", () => {
		expect(extractWorkStage("Этап 218. Сбор и анализ требований")).toBe(
			"Этап 218",
		);
		expect(extractWorkStage("Этап_211. Разработка БТ")).toBe("Этап 211");
	});

	it("extracts E2E model-stream stages from registry work names", () => {
		expect(extractWorkStage("09. Адаптация и внедрение модели")).toBe("09");
		expect(extractWorkStage("05A. Разработка пилотной модели (MVP)")).toBe(
			"05A",
		);
		expect(extractWorkStage("AutoML: внедрение")).toBe("AutoML");
	});

	it("matches model-stream registry works to catalog rows with formulas", () => {
		const groups = groupCatalogWorks();
		const rows = findCatalogRowsForRegistryWork(
			{
				name: "09. Адаптация и внедрение модели",
				archComponentType: "Модельный сервис",
			},
			groups,
		);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.formulaText).toContain("архкоэф(Модели");
		expect(rows[0]?.triggerRules?.[0]?.paramName).toBe("Каналы внедрения");
	});

	it("fans out model-stream catalog settings to mother + children", () => {
		expect(
			resolveCatalogApplyStreams(
				"Модельный стрим",
				V2_MODEL_STREAM_REGISTRY_STREAM_NAMES,
			),
		).toEqual([...V2_MODEL_STREAM_REGISTRY_STREAM_NAMES]);
		expect(resolveCatalogApplyStreams("Модельный стрим")).toEqual([
			"Модельный стрим",
		]);
		expect(
			resolveCatalogApplyStreams("ИД. Внутренний", ["Источники данных"]),
		).toEqual(["Источники данных"]);
	});

	it("finds catalog formula for child stream via registry fan-out", () => {
		const rows = [
			{
				stream: "Модельный стрим",
				component: "Модель",
				stage: "09",
				name: "Адаптация",
				originalName: "Адаптация",
				workType: "Опциональная",
				norm: 1,
				normRaw: "1",
				triggerParam: "",
				triggerParams: [] as string[],
				laborParams: [] as string[],
				formulaText: "N * 2",
				roundingMode: "CEIL" as const,
				roundingStep: 0.1,
			},
		];
		const child = V2_MODEL_STREAM_REGISTRY_STREAM_NAMES[1];
		expect(child).toBeTruthy();
		expect(findCatalogFormulaForStream(rows, child!)).toBeNull();
		expect(
			findCatalogFormulaForStream(
				rows,
				child!,
				V2_MODEL_STREAM_REGISTRY_STREAM_NAMES,
			)?.formulaText,
		).toBe("N * 2");
	});

	it("model works without triggerRules still have triggerArchCount in catalog", () => {
		const groups = groupCatalogWorks();
		const stage01 = findCatalogRowsForRegistryWork(
			{
				name: "01. Постановка задачи",
				archComponentType: "Модельный сервис",
			},
			groups,
		);
		expect(stage01[0]?.triggerArchCount?.kind).toBe("modelService");
		expect(stage01[0]?.triggerArchCount?.steps?.[0]).toMatchObject({
			count: 1,
			coefficient: 1,
		});

		const stage05 = findCatalogRowsForRegistryWork(
			{
				name: "05. Разработка модели",
				archComponentType: "Модель",
			},
			groups,
		);
		expect(stage05[0]?.triggerArchCount?.kind).toBe("model");
	});

	it("does not merge same-name works from different stages", () => {
		const groups = groupCatalogWorks();
		const stage217 = findCatalogRowsForRegistryWork(
			{
				name: "Этап 217. Интервьюирование заказчика, подтверждение финансирования и обработка RDS",
				archComponentType: "Процесс обработки данных",
			},
			groups,
		);
		const stage218 = findCatalogRowsForRegistryWork(
			{
				name: "Этап 218. Интервьюирование заказчика, подтверждение финансирования и обработка RDS",
				archComponentType: "Процесс обработки данных",
			},
			groups,
		);

		expect(stage217).toHaveLength(1);
		expect(stage217[0]?.stage).toBe("Этап 217");
		expect(stage218).toHaveLength(1);
		expect(stage218[0]?.stage).toBe("Этап 218");
		expect(stage217[0]?.formulaText).not.toBe(stage218[0]?.formulaText);
	});
});
