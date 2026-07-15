import { describe, expect, it } from "vitest";
import {
	laborValueMatches,
	resolveByValueLaborParamCoefficients,
} from "./v2-works-catalog-match.util";

describe("numeric labor coefficient ranges", () => {
	it("matches non-overlapping Russian range labels", () => {
		expect(laborValueMatches(20, "do_20", "до 20 метрик")).toBe(true);
		expect(laborValueMatches(35, "20_50", "20–50 метрик")).toBe(true);
		expect(laborValueMatches(51, "over_50", ">50 метрик")).toBe(true);
		expect(laborValueMatches(20, "20_50", "20–50 метрик")).toBe(false);
	});

	it("resolves metric count into the imported coefficient", () => {
		const rows = [
			{
				paramCode: "kolichestvo_metrik",
				paramName: "Количество метрик",
				valueCode: "do_20",
				valueLabel: "до 20 метрик",
				coefficient: 1,
			},
			{
				paramCode: "kolichestvo_metrik",
				paramName: "Количество метрик",
				valueCode: "20_50",
				valueLabel: "20–50 метрик",
				coefficient: 1.2,
			},
			{
				paramCode: "kolichestvo_metrik",
				paramName: "Количество метрик",
				valueCode: "over_50",
				valueLabel: ">50 метрик",
				coefficient: 1.4,
			},
		];

		expect(
			resolveByValueLaborParamCoefficients({ kolichestvo_metrik: 42 }, rows),
		).toEqual({ kolichestvo_metrik: 1.2 });
	});
});
