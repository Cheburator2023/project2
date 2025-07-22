import {
	mapProbability,
	mapInitiativeTimeline,
	mapInitiativeCost,
	mapInfluence,
	calculateImpactAssessment,
	calculateRiskLevelAssessment,
	mapRiskLevelToCoefficient,
	calculateGeneralUncertaintyCoefficientForItem,
	calculateTotalGeneralUncertaintyCoefficient,
	GeneralUncertaintyInput,
} from "./generalUncertaintyCoefficient";

describe("General Uncertainty Coefficient Calculation (new logic)", () => {
	describe("mapping functions", () => {
		it("maps probability values correctly (schema enums)", () => {
			expect(mapProbability("Реализация 1 раз в 6 мес. или чаще")).toBe(
				"Очень высокая",
			);
			expect(mapProbability("Реализация 1 раз в год")).toBe("Высокая");
			expect(mapProbability("Реализация 1 раз в 1-3 года")).toBe("Средняя");
			expect(mapProbability("Реализация 1 раз в 3-10 лет")).toBe("Низкая");
			expect(mapProbability("Реализация не чаще 1 раза в 10 лет")).toBe(
				"Очень низкая",
			);
			expect(mapProbability("unknown")).toBe("Не применимо");
		});
		it("maps initiativeTimeline values correctly (schema enums)", () => {
			expect(mapInitiativeTimeline("Более 18 мес.")).toBe("Неприемлемая");
			expect(mapInitiativeTimeline("10-18 мес.")).toBe("Высокая");
			expect(mapInitiativeTimeline("4-10 мес.")).toBe("Существенная");
			expect(mapInitiativeTimeline("1-4 мес.")).toBe("Средняя");
			expect(mapInitiativeTimeline("Менее 1 мес.")).toBe("Низкая");
			expect(mapInitiativeTimeline("unknown")).toBe("Не применимо");
		});
		it("maps initiativeCost values correctly (schema enums)", () => {
			expect(mapInitiativeCost("От 2 млрд.")).toBe("Неприемлемая");
			expect(mapInitiativeCost("870 млн. - 2 млрд.")).toBe("Высокая");
			expect(mapInitiativeCost("438-870 млн.")).toBe("Существенная");
			expect(mapInitiativeCost("45.3-438 млн.")).toBe("Средняя");
			expect(mapInitiativeCost("До 45.3 млн.")).toBe("Низкая");
			expect(mapInitiativeCost("unknown")).toBe("Не применимо");
		});
		it("maps influence values correctly (schema enums)", () => {
			expect(
				mapInfluence("Критичное отклонение качества реализации проекта"),
			).toBe("Неприемлемая");
			expect(
				mapInfluence(
					"Значительный негативный эффект на возможность достижения целей проекта",
				),
			).toBe("Высокая");
			expect(
				mapInfluence(
					"Реализация проекта с контролируемыми отклонениями от изначальных целей",
				),
			).toBe("Существенная");
			expect(
				mapInfluence(
					"Незначительное влияние на задачи и сроки достижения целей проекта",
				),
			).toBe("Средняя");
			expect(
				mapInfluence(
					"Незначительное влияние на вторичные функции в рамках проектной деятельности",
				),
			).toBe("Низкая");
			expect(mapInfluence("unknown")).toBe("Не применимо");
		});
		it("returns 'Не применимо' for empty or invalid values", () => {
			expect(mapProbability("")).toBe("Не применимо");
			expect(mapInitiativeTimeline("")).toBe("Не применимо");
			expect(mapInitiativeCost("")).toBe("Не применимо");
			expect(mapInfluence("")).toBe("Не применимо");
			expect(mapProbability(undefined as any)).toBe("Не применимо");
		});
	});

	describe("calculation steps", () => {
		it("calculates impactAssessment correctly", () => {
			expect(
				calculateImpactAssessment("Высокая", "Средняя", "Существенная"),
			).toBe("Высокая");
			expect(calculateImpactAssessment("Средняя", "Средняя", "Средняя")).toBe(
				"Средняя",
			);
			expect(
				calculateImpactAssessment("Неприемлемая", "Средняя", "Средняя"),
			).toBe("Неприемлемая");
			expect(
				calculateImpactAssessment("Не применимо", "Средняя", "Средняя"),
			).toBe("Не применимо");
		});
		it("calculates riskLevelAssessment correctly", () => {
			expect(
				calculateRiskLevelAssessment("Неприемлемая", "Очень высокая"),
			).toBe("Очень высокий");
			expect(calculateRiskLevelAssessment("Высокая", "Средняя")).toBe(
				"Высокий",
			);
			expect(calculateRiskLevelAssessment("Существенная", "Очень низкая")).toBe(
				"Низкий",
			);
			expect(calculateRiskLevelAssessment("Средняя", "Низкая")).toBe("Низкий");
			expect(calculateRiskLevelAssessment("Низкая", "Очень высокая")).toBe(
				"Средний",
			);
			expect(
				calculateRiskLevelAssessment("Не применимо", "Очень высокая"),
			).toBe("Не применимо");
		});
		it("maps riskLevel to coefficient correctly", () => {
			expect(mapRiskLevelToCoefficient("Низкий")).toBe(0.03);
			expect(mapRiskLevelToCoefficient("Средний")).toBe(0.05);
			expect(mapRiskLevelToCoefficient("Высокий")).toBe(0.07);
			expect(mapRiskLevelToCoefficient("Очень высокий")).toBe(0.1);
			expect(mapRiskLevelToCoefficient("Не применимо")).toBe(0.0);
		});
	});

	describe("calculateGeneralUncertaintyCoefficientForItem", () => {
		it("returns 0.10 for very high risk item", () => {
			const item: GeneralUncertaintyInput = {
				initiativeTimeline: "Более 18 мес.",
				initiativeCost: "От 2 млрд.",
				influence: "Критичное отклонение качества реализации проекта",
				probability: "Реализация 1 раз в 6 мес. или чаще",
			};
			expect(calculateGeneralUncertaintyCoefficientForItem(item)).toBe(0.1);
		});
		it("returns 0.05 for medium risk item", () => {
			const item: GeneralUncertaintyInput = {
				initiativeTimeline: "4-10 мес.",
				initiativeCost: "45.3-438 млн.",
				influence:
					"Реализация проекта с контролируемыми отклонениями от изначальных целей",
				probability: "Реализация 1 раз в 3-10 лет",
			};
			expect(calculateGeneralUncertaintyCoefficientForItem(item)).toBe(0.05);
		});
		it("returns 0.03 for low risk item", () => {
			const item: GeneralUncertaintyInput = {
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "До 45.3 млн.",
				influence:
					"Незначительное влияние на вторичные функции в рамках проектной деятельности",
				probability: "Реализация 1 раз в 3-10 лет",
			};
			expect(calculateGeneralUncertaintyCoefficientForItem(item)).toBe(0.03);
		});
		it("returns 0.00 for not applicable", () => {
			const item: GeneralUncertaintyInput = {
				initiativeTimeline: "unknown",
				initiativeCost: "unknown",
				influence: "unknown",
				probability: "unknown",
			};
			expect(calculateGeneralUncertaintyCoefficientForItem(item)).toBe(0.0);
		});
	});

	describe("calculateTotalGeneralUncertaintyCoefficient", () => {
		it("returns sum for multiple items", () => {
			const items: GeneralUncertaintyInput[] = [
				{
					initiativeTimeline: "Более 18 мес.",
					initiativeCost: "От 2 млрд.",
					influence: "Критичное отклонение качества реализации проекта",
					probability: "Реализация 1 раз в 6 мес. или чаще",
				},
				{
					initiativeTimeline: "4-10 мес.",
					initiativeCost: "45.3-438 млн.",
					influence:
						"Реализация проекта с контролируемыми отклонениями от изначальных целей",
					probability: "Реализация 1 раз в 3-10 лет",
				},
				{
					initiativeTimeline: "Менее 1 мес.",
					initiativeCost: "До 45.3 млн.",
					influence:
						"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					probability: "Реализация 1 раз в 3-10 лет",
				},
			];
			expect(calculateTotalGeneralUncertaintyCoefficient(items)).toBe(
				0.1 + 0.05 + 0.03,
			);
		});
		it("returns 0 for all not applicable", () => {
			const items: GeneralUncertaintyInput[] = [
				{
					initiativeTimeline: "unknown",
					initiativeCost: "unknown",
					influence: "unknown",
					probability: "unknown",
				},
			];
			expect(calculateTotalGeneralUncertaintyCoefficient(items)).toBe(0.0);
		});
		it("returns 0 for empty array", () => {
			expect(calculateTotalGeneralUncertaintyCoefficient([])).toBe(0);
		});
	});
});
