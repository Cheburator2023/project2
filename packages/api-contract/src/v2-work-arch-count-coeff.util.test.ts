import { describe, expect, it } from "vitest";
import {
	archCountTriggerMatches,
	decodeTriggerArchCountCondition,
	encodeTriggerArchCountSteps,
	evalArchCountCoefficientFormula,
	formatArchCountCoeffSteps,
	formatLaborArchCountStepLabel,
	lookupArchCountCoefficient,
	parseArchCountCoeffSteps,
	parseWorkArchCountKindLabel,
	resolveArchCountCoeffFromToken,
	resolveWorkArchComponentCount,
	validateArchCountCoeffSteps,
} from "./v2-work-arch-count-coeff.util";

describe("v2-work-arch-count-coeff.util", () => {
	it("resolves model count from modelsList", () => {
		expect(
			resolveWorkArchComponentCount(
				{
					detailInfo: {
						modelsList: [{ name: "A" }, { name: "B" }],
					},
				},
				"model",
			),
		).toBe(2);
	});

	it("resolves filled source systems count", () => {
		expect(
			resolveWorkArchComponentCount(
				{
					detailInfo: {
						sourceSystems: [{ name: "S1" }, {}, { name: "S2" }],
					},
				},
				"sourceSystem",
			),
		).toBe(2);
	});

	it("lookupArchCountCoefficient returns exact match for legacy steps", () => {
		const steps = [
			{ count: 1, coefficient: 2 },
			{ count: 2, coefficient: 1.5 },
		];
		expect(lookupArchCountCoefficient(steps, 1)).toBe(2);
		expect(lookupArchCountCoefficient(steps, 2)).toBe(1.5);
		expect(lookupArchCountCoefficient(steps, 3)).toBeNull();
	});

	it("lookupArchCountCoefficient supports ranges and N formulas", () => {
		const steps = [
			{ count: 5, coefficient: 1, operator: "<=" as const },
			{
				count: 5,
				coefficient: 1,
				operator: ">" as const,
				coefficientFormula: "N/5",
			},
		];
		expect(lookupArchCountCoefficient(steps, 3)).toBe(1);
		expect(lookupArchCountCoefficient(steps, 5)).toBe(1);
		expect(lookupArchCountCoefficient(steps, 10)).toBe(2);
	});

	it("lookupArchCountCoefficient uses first matching step by order", () => {
		const steps = [
			{
				count: 1,
				coefficient: 9,
				operator: ">=" as const,
				coefficientFormula: null,
			},
			{ count: 5, coefficient: 1, operator: "<=" as const },
		];
		expect(lookupArchCountCoefficient(steps, 3)).toBe(9);
	});

	it("evalArchCountCoefficientFormula evaluates safe expressions", () => {
		expect(evalArchCountCoefficientFormula("N/5", 10)).toBe(2);
		expect(evalArchCountCoefficientFormula("1+(N-1)*0.75", 5)).toBe(4);
		expect(evalArchCountCoefficientFormula("N/0", 5)).toBeNull();
		expect(evalArchCountCoefficientFormula("Math.max(N,1)", 5)).toBeNull();
		expect(evalArchCountCoefficientFormula("alert(1)", 5)).toBeNull();
		expect(evalArchCountCoefficientFormula("", 5)).toBeNull();
	});

	it("validateArchCountCoeffSteps accepts formulas and rejects duplicates", () => {
		expect(
			validateArchCountCoeffSteps("sourceSystem", [
				{ count: 5, coefficient: 1, operator: "<=", coefficientFormula: null },
				{
					count: 5,
					coefficient: 1,
					operator: ">",
					coefficientFormula: "N/5",
				},
			]),
		).toBeNull();
		expect(
			validateArchCountCoeffSteps("sourceSystem", [
				{ count: 5, coefficient: 1, operator: "<=" },
				{ count: 5, coefficient: 2, operator: "<=" },
			]),
		).toMatch(/Повторяющееся/);
		expect(
			validateArchCountCoeffSteps("sourceSystem", [
				{ count: 5, coefficient: 1, coefficientFormula: "N/" },
			]),
		).toMatch(/Формула/);
	});

	it("resolveArchCountCoeffFromToken falls back to 1", () => {
		expect(
			resolveArchCountCoeffFromToken(
				{ detailInfo: { modelsList: [{}, {}, {}] } },
				"model",
				[{ count: 1, coefficient: 2 }],
			),
		).toBe(1);
	});

	it("validateArchCountCoeffSteps enforces model range 1-99", () => {
		expect(
			validateArchCountCoeffSteps("model", [{ count: 100, coefficient: 1 }]),
		).toMatch(/1.*99/);
	});

	it("parseArchCountCoeffSteps and format round-trip", () => {
		const raw = "1=2; 2=1.5";
		const steps = parseArchCountCoeffSteps(raw);
		expect(steps).toEqual([
			{ count: 1, coefficient: 2 },
			{ count: 2, coefficient: 1.5 },
		]);
		expect(formatArchCountCoeffSteps(steps!)).toBe("1=2; 2=1,5");
	});

	it("formatLaborArchCountStepLabel uses operators and formulas", () => {
		expect(
			formatLaborArchCountStepLabel({
				count: 5,
				coefficient: 1,
				operator: "<=",
			}),
		).toBe("≤5 → 1");
		expect(
			formatLaborArchCountStepLabel({
				count: 5,
				coefficient: 1,
				operator: ">",
				coefficientFormula: "N/5",
			}),
		).toBe(">5 → N/5");
	});

	it("parseWorkArchCountKindLabel accepts Russian labels", () => {
		expect(parseWorkArchCountKindLabel("Модели")).toBe("model");
		expect(parseWorkArchCountKindLabel("Система-источник")).toBe("sourceSystem");
	});

	it("archCountTriggerMatches supports comparison operators", () => {
		const formWithTwoModels = {
			detailInfo: { modelsList: [{ id: 1 }, { id: 2 }] },
		};
		expect(
			archCountTriggerMatches(
				formWithTwoModels,
				"model",
				encodeTriggerArchCountSteps(">=", 2),
			),
		).toBe(true);
		expect(
			archCountTriggerMatches(
				formWithTwoModels,
				"model",
				encodeTriggerArchCountSteps("=", 2),
			),
		).toBe(true);
		expect(
			archCountTriggerMatches(
				formWithTwoModels,
				"model",
				encodeTriggerArchCountSteps("=", 3),
			),
		).toBe(false);
		expect(
			archCountTriggerMatches(
				formWithTwoModels,
				"model",
				encodeTriggerArchCountSteps(">", 2),
			),
		).toBe(false);
		expect(
			archCountTriggerMatches(
				formWithTwoModels,
				"model",
				encodeTriggerArchCountSteps("<=", 2),
			),
		).toBe(true);
	});

	it("trigger encode/decode ignores labor-only fields", () => {
		const steps = encodeTriggerArchCountSteps("<=", 5);
		expect(steps).toEqual([{ count: 5, coefficient: -2 }]);
		expect(decodeTriggerArchCountCondition(steps)).toEqual({
			operator: "<=",
			threshold: 5,
		});
		expect(
			decodeTriggerArchCountCondition([
				{
					count: 5,
					coefficient: -2,
					operator: ">",
					coefficientFormula: "N/5",
				},
			]),
		).toEqual({ operator: "<=", threshold: 5 });
	});

	it("archCountTriggerMatches requires count >= min step (legacy)", () => {
		expect(
			archCountTriggerMatches({}, "model", [{ count: 2, coefficient: 1 }]),
		).toBe(false);
	});
});
