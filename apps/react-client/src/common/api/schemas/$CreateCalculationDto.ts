/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateCalculationDto = {
	properties: {
		name: {
			type: "string",
			description: `Название расчета`,
			isRequired: true,
		},
		modelsCount: {
			type: "number",
			description: `Количество моделей (>1 для каскадов и ансамблей моделей)`,
			isRequired: true,
			maximum: 99,
			minimum: 1,
		},
		setupComplexity: {
			type: "string",
			description: `Сложность настройки`,
			isRequired: true,
		},
		initiativeTimeline: {
			type: "string",
			description: `Срок реализации инициативы`,
			isRequired: true,
		},
		initiativeCost: {
			type: "string",
			description: `Стоимость инициативы`,
			isRequired: true,
		},
		uncertaintyAdjustment: {
			type: "number",
			description: `Корректировка неопределенности`,
			isRequired: true,
		},
		generalUncertainty: {
			type: "array",
			contains: {
				type: "UncertaintyItemDto",
			},
			isRequired: true,
		},
		readyPromReports: {
			type: "string",
			description: `Наличие готовых промоделированных отчетов`,
			isRequired: true,
		},
		assessedInitiativesCount: {
			type: "number",
			description: `Количество оцененных инициатив`,
			isRequired: true,
		},
		dataSourcesCount: {
			type: "string",
			description: `Количество источников данных`,
			isRequired: true,
		},
		pilotModelRequired: {
			type: "string",
			description: `Требуется ли пилотная модель`,
			isRequired: true,
		},
		algorithmComplexity: {
			type: "array",
			contains: {
				type: "AlgorithmTypeItemDto",
			},
			isRequired: true,
		},
		pilotSupportRequired: {
			type: "string",
			description: `Требуется ли поддержка пилота`,
			isRequired: true,
		},
		autoMlRequired: {
			type: "string",
			description: `Требуется ли AutoML`,
			isRequired: true,
		},
		productionAdditionalReports: {
			type: "number",
			description: `Дополнительные отчеты для продакшена`,
			isRequired: true,
		},
		productionDeploymentChannels: {
			type: "array",
			contains: {
				type: "string",
			},
			isRequired: true,
		},
		finalCoefficient: {
			type: "number",
			description: `Финальный коэффициент расчета`,
			isRequired: true,
		},
	},
} as const;
