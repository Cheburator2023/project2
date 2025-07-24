import type { StageValues } from "./assessmentCalculationsStore";
import {
	calculateCoefficients,
	calculateStageResults,
} from "./assessmentCalculationsStore";

describe("Assessment Calculations", () => {
	it("should calculate correct coefficients and stage results for the provided form values", () => {
		const formData = {
			modelsCount: 7,
			setupComplexity:
				"4 Сложность: Банком не планируется предоставление Модели регулятору для одобрения к использованию, но проведение регулярной валидации Моделей установлена Регулятором",
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
			readyPromReports: "Нет",
			assessedInitiativesCount: 1,
			dataSourcesCount: "2",
			pilotModelRequired: "Да",
			pilotSupportRequired: "Да",
			algorithmComplexity: [
				{ algorithmType: "Табличные данные" },
				{ algorithmType: "Текстовая аналитика_Классические модели" },
				{ algorithmType: "Текстовая аналитика_LLM" },
				{ algorithmType: "Аудио Аналитика" },
				{ algorithmType: "Компьютерное зрение_CV" },
				{ algorithmType: "Гео-аналитика" },
				{ algorithmType: "Оптимизационная задача" },
			],
			autoMlRequired: "Не требуется",
			productionAdditionalReports: "6",
			productionDeploymentChannels: ["Графовая платформа"],
		};

		const expectedCoefficients = {
			modelsCountCoefficient: 5.5,
			setupComplexityCoefficient: 1.75,
			generalUncertaintyCoefficient: 1.27,
			readyPromReportsCoefficient: 1.0,
			dataSourcesCountCoefficient: 1.2,
			pilotModelRequired: 1.0,
			algorithmComplexityCoefficient: 12.3,
			pilotSupportRequired: 1.0,
			autoMlRequired: 0.0,
			productionAdditionalReportsCoefficient: 4.75,
			deploymentChannelsCoefficient: 3.0,
		};

		const expectedStages: StageValues = {
			stage01: 403.39,
			stage02: 22.86,
			stage04: 113.35,
			stage05A: 6014.09,
			stage05: 5563.03,
			amlDrafting: 0,
			stage05B: 43.18,
			stage07: 591.19,
			stage09: 22552.82,
			amlEnforcement: 0,
		};

		const coefficients = calculateCoefficients(formData);
		const stages = calculateStageResults(formData, coefficients);

		// Check coefficients
		(
			Object.keys(expectedCoefficients) as (keyof typeof expectedCoefficients)[]
		).forEach((key) => {
			const actual = Number(coefficients[key]).toFixed(2);
			const expected = Number(expectedCoefficients[key]).toFixed(2);
			if (actual !== expected) {
				console.error(
					`Coefficient mismatch for ${key}: actual=${actual}, expected=${expected}`,
				);
			}
			expect(actual).toBe(expected);
		});

		// Check stages
		(Object.keys(expectedStages) as (keyof StageValues)[]).forEach((key) => {
			const actual = Number(stages[key]).toFixed(2);
			const expected = Number(expectedStages[key]).toFixed(2);
			if (actual !== expected) {
				console.error(
					`Stage mismatch for ${key}: actual=${actual}, expected=${expected}`,
				);
			}
			expect(actual).toBe(expected);
		});
	});

	it("should calculate correct coefficients and stage results for another set of form values", () => {
		const formData = {
			modelsCount: 3,
			setupComplexity:
				"5 Сложность: Банком планируется предоставление Модели Регулятору для одобрения к использованию",
			initiativeTimeline: "Менее 1 мес.",
			initiativeCost: "45.3-438 млн.",
			uncertaintyAdjustment: 22,
			generalUncertainty: [
				{
					type: "businessProcessComplexity",
					probability: "Реализация 1 раз в 6 мес. или чаще",
					influence:
						"Незначительное влияние на вторичные функции в рамках проектной деятельности",
				},
				{
					type: "adjacentProjectsImpact",
					probability: "Реализация 1 раз в год",
					influence:
						"Реализация проекта с контролируемыми отклонениями от изначальных целей",
				},
			],
			readyPromReports: "Нет",
			assessedInitiativesCount: 1,
			dataSourcesCount: "2",
			pilotModelRequired: "Да",
			pilotSupportRequired: "Да",
			algorithmComplexity: [
				{ algorithmType: "Табличные данные" },
				{ algorithmType: "Текстовая аналитика_LLM" },
			],
			autoMlRequired: "Да",
			productionAdditionalReports: "3",
			productionDeploymentChannels: ["Батч"],
		};

		const expectedCoefficients = {
			modelsCountCoefficient: 2.5,
			setupComplexityCoefficient: 2,
			generalUncertaintyCoefficient: 1.36,
			readyPromReportsCoefficient: 1.0,
			dataSourcesCountCoefficient: 1.2,
			pilotModelRequired: 1.0,
			algorithmComplexityCoefficient: 2.15,
			pilotSupportRequired: 1.0,
			autoMlRequired: 1.0,
			productionAdditionalReportsCoefficient: 2.5,
			deploymentChannelsCoefficient: 0.5,
		};

		const expectedStages: StageValues = {
			stage01: 224.4,
			stage02: 24.48,
			stage04: 138.72, // Update this value to match roundup logic
			stage05A: 584.8,
			stage05: 540.94,
			amlDrafting: 462.4,
			stage05B: 46.24,
			stage07: 380.8,
			stage09: 365.5,
			amlEnforcement: 462.4,
		};

		const coefficients = calculateCoefficients(formData);
		const stages = calculateStageResults(formData, coefficients);

		// Check coefficients
		(
			Object.keys(expectedCoefficients) as (keyof typeof expectedCoefficients)[]
		).forEach((key) => {
			const actual = Number(coefficients[key]).toFixed(2);
			const expected = Number(expectedCoefficients[key]).toFixed(2);
			if (actual !== expected) {
				console.error(
					`Coefficient mismatch for ${key}: actual=${actual}, expected=${expected}`,
				);
			}
			expect(actual).toBe(expected);
		});

		// Check stages
		(Object.keys(expectedStages) as (keyof StageValues)[]).forEach((key) => {
			const actual = Number(stages[key]).toFixed(2);
			const expected = Number(expectedStages[key]).toFixed(2);
			if (actual !== expected) {
				console.error(
					`Stage mismatch for ${key}: actual=${actual}, expected=${expected}`,
				);
			}
			expect(actual).toBe(expected);
		});
	});
});
