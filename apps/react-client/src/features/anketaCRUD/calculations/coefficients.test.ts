import {
	calculateAlgorithmComplexityCoefficient,
	calculateDataSourceCoefficient,
	calculateDeploymentChannelCoefficient,
	calculateModelsCoefficient,
	calculateSetupComplexityCoefficient,
	getAutoMlCoefficient,
	getPilotModelCoefficient,
	getPilotSupportCoefficient,
	getProductionAdditionalReportsCoefficient,
	getReadyPromReportsCoefficient,
	calculateTotalUncertainty,
} from "./coefficients";

describe("Coefficient Calculations", () => {
	describe("calculateModelsCoefficient", () => {
		it("returns 1 for 1 model", () => {
			expect(calculateModelsCoefficient(1)).toBe(1);
		});
		it("returns correct value for >1 models", () => {
			expect(calculateModelsCoefficient(3)).toBe(1 + (3 - 1) * 0.75);
		});
		it("throws for <1", () => {
			expect(() => calculateModelsCoefficient(0)).toThrow();
		});
	});

	describe("calculateSetupComplexityCoefficient", () => {
		it("returns 1 for undefined", () => {
			expect(calculateSetupComplexityCoefficient(undefined)).toBe(1);
		});
		it("returns correct value for known strings", () => {
			expect(
				calculateSetupComplexityCoefficient(
					"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
				),
			).toBe(1);
			expect(
				calculateSetupComplexityCoefficient(
					"5 Сложность: Банком планируется предоставление Модели Регулятору для одобрения к использованию",
				),
			).toBe(2);
		});
		it("throws for unknown string", () => {
			expect(() => calculateSetupComplexityCoefficient("unknown")).toThrow();
		});
	});

	describe("getReadyPromReportsCoefficient", () => {
		it('returns 0.5 for "Да"', () => {
			expect(getReadyPromReportsCoefficient("Да")).toBe(0.5);
		});
		it('returns 1 for "Нет"', () => {
			expect(getReadyPromReportsCoefficient("Нет")).toBe(1);
		});
		it("throws for invalid value", () => {
			expect(() => getReadyPromReportsCoefficient("invalid")).toThrow();
		});
	});

	describe("calculateDataSourceCoefficient", () => {
		it("returns correct value for 1-10", () => {
			expect(calculateDataSourceCoefficient(0)).toBe(1);
			expect(calculateDataSourceCoefficient(1)).toBe(1);
			expect(calculateDataSourceCoefficient(10)).toBe(3);
		});
		it("throws for out of range", () => {
			expect(() => calculateDataSourceCoefficient(11)).toThrow();
		});
	});

	describe("getPilotModelCoefficient", () => {
		it('returns 1 for "Да"', () => {
			expect(getPilotModelCoefficient("Да")).toBe(1);
		});
		it('returns 0 for "Не требуется"', () => {
			expect(getPilotModelCoefficient("Не требуется")).toBe(0);
		});
		it("throws for invalid", () => {
			expect(() => getPilotModelCoefficient("invalid")).toThrow();
		});
	});

	describe("calculateAlgorithmComplexityCoefficient", () => {
		it("returns correct sum for known types", () => {
			expect(
				calculateAlgorithmComplexityCoefficient([
					{ algorithmType: "Табличные данные" },
					{ algorithmType: "Текстовая аналитика_LLM" },
				]),
			).toBe(0.75 + 1.4);
		});
		it("skips unknown/empty types", () => {
			expect(
				calculateAlgorithmComplexityCoefficient([
					{ algorithmType: "" },
					{ algorithmType: "unknown" },
				]),
			).toBe(0);
		});
	});

	describe("getPilotSupportCoefficient", () => {
		it('returns 1 for "Да"', () => {
			expect(getPilotSupportCoefficient("Да")).toBe(1);
		});
		it('returns 0 for "Не требуется"', () => {
			expect(getPilotSupportCoefficient("Не требуется")).toBe(0);
		});
		it("throws for invalid", () => {
			expect(() => getPilotSupportCoefficient("invalid")).toThrow();
		});
	});

	describe("getAutoMlCoefficient", () => {
		it('returns 1 for "Да"', () => {
			expect(getAutoMlCoefficient("Да")).toBe(1);
		});
		it('returns 0 for "Не требуется"', () => {
			expect(getAutoMlCoefficient("Не требуется")).toBe(0);
		});
		it("throws for invalid", () => {
			expect(() => getAutoMlCoefficient("invalid")).toThrow();
		});
	});

	describe("getProductionAdditionalReportsCoefficient", () => {
		it('returns 0 for "Не требуется"', () => {
			expect(getProductionAdditionalReportsCoefficient("Не требуется")).toBe(0);
		});
		it('returns 1 for "1"', () => {
			expect(getProductionAdditionalReportsCoefficient("1")).toBe(1);
		});
		it("returns correct value for >1", () => {
			expect(getProductionAdditionalReportsCoefficient("3")).toBe(
				1 + (3 - 1) * 0.75,
			);
		});
		it("returns 0 for out of range", () => {
			expect(getProductionAdditionalReportsCoefficient("0")).toBe(0);
			expect(getProductionAdditionalReportsCoefficient("100")).toBe(0);
		});
	});

	describe("calculateDeploymentChannelCoefficient", () => {
		it("returns correct sum for known channels", () => {
			expect(calculateDeploymentChannelCoefficient(["Батч", "LLM"])).toBe(
				0.5 + 2.0,
			);
		});
		it("throws for unknown channel", () => {
			expect(() =>
				calculateDeploymentChannelCoefficient(["unknown"]),
			).toThrow();
		});
	});

	describe("calculateTotalUncertainty", () => {
		it("returns 1.1 for a single uncertainty item with no adjustment", () => {
			const formData = {
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "От 2 млрд.",
				uncertaintyAdjustment: null,
				generalUncertainty: [
					{
						type: "businessProcessComplexity",
						probability: "Реализация 1 раз в 6 мес. или чаще",
						influence:
							"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					},
				],
			};
			const result = calculateTotalUncertainty(
				formData.generalUncertainty,
				formData.initiativeTimeline,
				formData.initiativeCost,
				formData.uncertaintyAdjustment ?? 0,
			);
			expect(result).toBe(1.1);
		});

		it("returns 1.32 for a single uncertainty item with 22% adjustment", () => {
			const formData = {
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "От 2 млрд.",
				uncertaintyAdjustment: 22,
				generalUncertainty: [
					{
						type: "businessProcessComplexity",
						probability: "Реализация 1 раз в 6 мес. или чаще",
						influence:
							"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					},
				],
			};
			const result = calculateTotalUncertainty(
				formData.generalUncertainty,
				formData.initiativeTimeline,
				formData.initiativeCost,
				formData.uncertaintyAdjustment ?? 0,
			);
			expect(result).toBe(1.32);
		});
	});
});
