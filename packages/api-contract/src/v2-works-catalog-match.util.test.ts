import { describe, expect, it } from "vitest";
import {
	resolveStreamFromSourceType,
	resolveStreamsFromSourceSystems,
	typicalWorkRulesMatchSource,
} from "./v2-works-catalog-match.util";

describe("v2-works-catalog-match.util", () => {
	it("resolves stream from source type", () => {
		expect(resolveStreamFromSourceType({ type: "Внутренний" })).toBe(
			"ИД. Внутренний",
		);
		expect(resolveStreamFromSourceType({ type: "Внешний" })).toBe("ИД. Внешний");
	});

	it("collects streams from source systems", () => {
		expect(
			resolveStreamsFromSourceSystems({
				streamDataSources: {
					sourceSystems: [{ type: "Внутренний" }, { type: "Внешний" }],
				},
			}),
		).toEqual(["ИД. Внутренний", "ИД. Внешний"]);
	});

	it("matches control type by bracket label", () => {
		const rules = [
			{
				paramCode: "вид_контроля_кд",
				paramName: "Вид контроля: КД",
				operator: "=",
				valueCode: null,
				valueLabel: "КД",
			},
		];
		expect(
			typicalWorkRulesMatchSource(rules, {
				value: "Качество модельных данных [КД]",
			}),
		).toBe(true);
		expect(typicalWorkRulesMatchSource(rules, { value: "Технический [ТМ]" })).toBe(
			false,
		);
	});

	it("matches source type trigger", () => {
		const rules = [
			{
				paramCode: "тип_источника_внутренний",
				paramName: "Тип источника (внутренний)",
				operator: "=",
				valueCode: null,
				valueLabel: "Внутренний",
			},
		];
		expect(typicalWorkRulesMatchSource(rules, { type: "Внутренний" })).toBe(true);
	});
});
