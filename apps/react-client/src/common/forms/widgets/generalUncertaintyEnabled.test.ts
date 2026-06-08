import { describe, expect, it } from "vitest";
import { resolveGeneralUncertaintyEnabled } from "./GeneralUncertaintyWidget";

describe("resolveGeneralUncertaintyEnabled", () => {
	it("reads v1 flat fields", () => {
		expect(
			resolveGeneralUncertaintyEnabled({
				initiativeCost: 100,
				initiativeTimeline: "До 6 мес.",
			}),
		).toBe(true);
	});

	it("reads v2 uncertaintyCalculation fields", () => {
		expect(
			resolveGeneralUncertaintyEnabled({
				uncertaintyCalculation: {
					initiativeCost: 1_500_000,
					initiativeTimeline: "До 12 мес.",
				},
			}),
		).toBe(true);
	});

	it("returns false when initiative fields are missing", () => {
		expect(resolveGeneralUncertaintyEnabled({})).toBe(false);
		expect(
			resolveGeneralUncertaintyEnabled({
				uncertaintyCalculation: { initiativeTimeline: "До 6 мес." },
			}),
		).toBe(false);
	});

	it("supports custom ui:options paths", () => {
		expect(
			resolveGeneralUncertaintyEnabled(
				{ calc: { cost: 10, timeline: "x" } },
				{
					initiativeCostPath: "calc.cost",
					initiativeTimelinePath: "calc.timeline",
				},
			),
		).toBe(true);
	});
});
