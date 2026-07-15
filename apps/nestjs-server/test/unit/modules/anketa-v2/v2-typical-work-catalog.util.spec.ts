import { describe, expect, it } from "vitest";
import {
	extractWorkStage,
	findCatalogRowsForRegistryWork,
	groupCatalogWorks,
} from "../../../../src/modules/anketa-v2/utils/v2-typical-work-catalog.util";

describe("v2-typical-work-catalog util", () => {
	it("extracts a normalized stage from factory work names", () => {
		expect(extractWorkStage("Этап 218. Сбор и анализ требований")).toBe(
			"Этап 218",
		);
		expect(extractWorkStage("Этап_211. Разработка БТ")).toBe("Этап 211");
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
