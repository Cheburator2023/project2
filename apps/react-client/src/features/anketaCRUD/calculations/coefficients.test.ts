/** biome-ignore-all lint/suspicious/noIrregularWhitespace: тестовые строки содержат русские формулировки из бизнес-схемы */
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

		it.each([
			[
				"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
				1,
			],
			[
				"2 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено. Модель оценки риска",
				1.25,
			],
			[
				"3 Сложность: Проведение регулярной валидации Моделей Регулятором нормативно не установлено. Заказчик запрашивает проведение первичной валидации модели",
				1.5,
			],
			[
				"4 Сложность: Банком не планируется предоставление Модели регулятору для одобрения к использованию, но проведение регулярной валидации Моделей установлена Регулятором",
				1.75,
			],
			[
				"5 Сложность: Банком планируется предоставление Модели Регулятору для одобрения к использованию",
				2,
			],
		])("maps setup complexity %s to %s", (value, expected) => {
			expect(calculateSetupComplexityCoefficient(value)).toBe(expected);
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

		it.each([
			[0, 1],
			[1, 1],
			[2, 1.2],
			[3, 1.4],
			[4, 1.6],
			[5, 1.8],
			[6, 2],
			[7, 2.2],
			[8, 2.4],
			[9, 2.6],
			[10, 3],
		])("maps %s data sources to %s", (count, expected) => {
			expect(calculateDataSourceCoefficient(count)).toBe(expected);
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

		it.each([
			["Табличные данные", 0.75],
			["Текстовая аналитика_Классические модели", 1.25],
			["Текстовая аналитика_LLM", 1.4],
			["Аудио Аналитика", 1.6],
			["Компьютерное зрение_CV", 1.8],
			["Оптимизационная задача", 2.5],
			["Гео-аналитика", 3],
			["Графовая аналитика", 3.5],
		])("maps algorithm type %s to %s", (algorithmType, expected) => {
			expect(calculateAlgorithmComplexityCoefficient([{ algorithmType }])).toBe(
				expected,
			);
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

		it.each([
			["Батч", 0.5],
			["Батч+загрузка данных потребителю", 0.75],
			["Батч + Онлайн", 1.2],
			["Онлайн", 1],
			["Онлайн gpu", 1.25],
			["Стриминг", 1.5],
			["Мобильные устройства", 1.75],
			["LLM", 2],
			["Гео-сервисы", 2.25],
			["Внедрение в облаке", 2.5],
			["Графовая платформа", 3],
		])("maps deployment channel %s to %s", (channel, expected) => {
			expect(calculateDeploymentChannelCoefficient([channel])).toBe(expected);
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

		it("returns 1.05 for a single uncertainty item with no adjustment", () => {
			const formData = {
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "От 2 млрд.",
				uncertaintyAdjustment: 0,
				generalUncertainty: [
					{
						type: "businessProcessComplexity",
						probability: "Реализация не чаще 1 раза в 10 лет",
						influence:
							"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					},
				],
				assessedInitiativesCount: 1,
			};
			const result = calculateTotalUncertainty(
				formData.generalUncertainty,
				formData.initiativeTimeline,
				formData.initiativeCost,
				formData.uncertaintyAdjustment ?? 0,
			);
			expect(result).toBe(1.05);
		});

		it("returns 1.04 for a single uncertainty item with no adjustment", () => {
			const formData = {
				modelsCount: 1,
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "До 45.3 млн.",
				uncertaintyAdjustment: 1,
				generalUncertainty: [
					{
						type: "businessProcessComplexity",
						probability: "Реализация не чаще 1 раза в 10 лет",
						influence:
							"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					},
				],
				assessedInitiativesCount: 1,
				dataSourcesCount: "0",
				pilotModelRequired: "Не требуется",
				pilotSupportRequired: "Не требуется",
				algorithmComplexity: [
					{
						algorithmType: "",
					},
				],
				autoMlRequired: "Не требуется",
				productionAdditionalReports: "",
				productionDeploymentChannels: [],
				setupComplexity: "",
				readyPromReports: "",
			};

			const result = calculateTotalUncertainty(
				formData.generalUncertainty,
				formData.initiativeTimeline,
				formData.initiativeCost,
				formData.uncertaintyAdjustment ?? 0,
			);
			expect(result).toBe(1.04);
		});

		it("returns 1.27 for a single uncertainty item with no adjustment", () => {
			const formData = {
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "До 45.3 млн.",
				uncertaintyAdjustment: 1,
				generalUncertainty: [
					{
						type: "projectSolutionDefects",
						probability: "Реализация не чаще 1 раза в 10 лет",
						influence:
							"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					},
					{
						type: "businessProcessComplexity",
						probability: "Реализация 1 раз в 3-10 лет",
						influence:
							"Незначительное влияние на задачи и сроки достижения целей проекта",
					},
					{
						type: "adjacentProjectsImpact",
						probability: "Реализация 1 раз в 6 мес. или чаще",
						influence: "Критичное отклонение качества реализации проекта",
					},
					{
						type: "qualifiedStaffShortage",
						probability: "Реализация 1 раз в год",
						influence: "Критичное отклонение качества реализации проекта",
					},
				],
			};
			const result = calculateTotalUncertainty(
				formData.generalUncertainty,
				formData.initiativeTimeline,
				formData.initiativeCost,
				formData.uncertaintyAdjustment ?? 0,
			);
			expect(result).toBe(1.27);
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

		it("returns 1.07 for a very high uncertainty item (case 1)", () => {
			const formData = {
				initiativeTimeline: "Более 18 мес.",
				initiativeCost: "От 2 млрд.",
				uncertaintyAdjustment: 0,
				generalUncertainty: [
					{
						type: "adjacentProjectsImpact",
						probability: "Реализация 1 раз в 3-10 лет",
						influence: "Критичное отклонение качества реализации проекта",
					},
				],
			};
			const result = calculateTotalUncertainty(
				formData.generalUncertainty,
				formData.initiativeTimeline,
				formData.initiativeCost,
				formData.uncertaintyAdjustment ?? 0,
			);
			expect(result).toBe(1.07);
		});

		it("returns 1.05 for a high/low uncertainty item (case 2)", () => {
			const formData = {
				initiativeTimeline: "Более 18 мес.",
				initiativeCost: "От 2 млрд.",
				uncertaintyAdjustment: 0,
				generalUncertainty: [
					{
						type: "adjacentProjectsImpact",
						probability: "Реализация не чаще 1 раза в 10 лет",
						influence: "Критичное отклонение качества реализации проекта",
					},
				],
			};
			const result = calculateTotalUncertainty(
				formData.generalUncertainty,
				formData.initiativeTimeline,
				formData.initiativeCost,
				formData.uncertaintyAdjustment ?? 0,
			);
			expect(result).toBe(1.05);
		});

		it("returns 1.05 for a low uncertainty item (case 3)", () => {
			const formData = {
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "До 45.3 млн.",
				uncertaintyAdjustment: 0,
				generalUncertainty: [
					{
						type: "adjacentProjectsImpact",
						probability: "Реализация 1 раз в год",
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
			expect(result).toBe(1.05);
		});

		it("returns 1.05 for a low uncertainty item (case 4)", () => {
			const formData = {
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "До 45.3 млн.",
				uncertaintyAdjustment: 0,
				generalUncertainty: [
					{
						type: "adjacentProjectsImpact",
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
			expect(result).toBe(1.05);
		});

		it("returns 1.79 for a low uncertainty item (case 5)", () => {
			const formData = {
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "До 45.3 млн.",
				uncertaintyAdjustment: 12,
				generalUncertainty: [
					{
						type: "businessProcessComplexity",
						probability: "Реализация не чаще 1 раза в 10 лет",
						influence:
							"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					},
					{
						type: "projectSolutionDefects",
						probability: "Реализация 1 раз в 3-10 лет",
						influence:
							"Незначительное влияние на задачи и сроки достижения целей проекта",
					},
					{
						type: "adjacentProjectsImpact",
						probability: "Реализация 1 раз в 1-3 года",
						influence:
							"Реализация проекта с контролируемыми отклонениями от изначальных целей",
					},
					{
						type: "planningRequirementGaps",
						probability: "Реализация 1 раз в год",
						influence:
							"Значительный негативный эффект на возможность достижения целей проекта",
					},
					{
						type: "contractorPerformanceIssues",
						probability: "Реализация 1 раз в 6 мес. или чаще",
						influence: "Критичное отклонение качества реализации проекта",
					},
					{
						type: "qualifiedStaffShortage",
						probability: "Реализация 1 раз в 6 мес. или чаще",
						influence:
							"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					},
					{
						type: "sanctionsRisk",
						probability: "Реализация не чаще 1 раза в 10 лет",
						influence: "Критичное отклонение качества реализации проекта",
					},
					{
						type: "controlProceduresGaps",
						probability: "Реализация 1 раз в год",
						influence:
							"Реализация проекта с контролируемыми отклонениями от изначальных целей",
					},
					{
						type: "regulatoryChanges",
						probability: "Реализация 1 раз в 3-10 лет",
						influence:
							"Значительный негативный эффект на возможность достижения целей проекта",
					},
					{
						type: "systemUnderutilization",
						probability: "Реализация не чаще 1 раза в 10 лет",
						influence:
							"Значительный негативный эффект на возможность достижения целей проекта",
					},
					{
						type: "itArchitectureChanges",
						probability: "Реализация 1 раз в 1-3 года",
						influence:
							"Реализация проекта с контролируемыми отклонениями от изначальных целей",
					},
				],
			};
			const result = calculateTotalUncertainty(
				formData.generalUncertainty,
				formData.initiativeTimeline,
				formData.initiativeCost,
				formData.uncertaintyAdjustment ?? 0,
			);
			expect(result).toBe(1.79);
		});
	});
});
