/** Демо-анкеты для реестра V2 (полные formData для теста ag-grid). */
export type V2QuestionnaireSeedSpec = {
	seriesId: string;
	calcName: string;
	readableId: string;
	author: string;
	finalCoefficient: number;
	formData: Record<string, unknown>;
	/** Дополнительные версии той же серии (v2, v3…). */
	extraVersions?: Array<{
		version: string;
		readableId: string;
		author: string;
		finalCoefficient: number;
		formData: Record<string, unknown>;
	}>;
};

const platformStreams = (
	items: Array<{
		streamName: string;
		baseTypicalScore: number;
		adjustedTypicalScore: number;
		deviationPercent: number;
		atypicalScore: number;
	}>,
) => items;

const e2eStages = (
	items: Array<{
		stageName: string;
		baseScore: number;
		complexityCoeff: number;
		deviationFromBase: number;
	}>,
) => items;

export const V2_QUESTIONNAIRE_DEMO_SEEDS: V2QuestionnaireSeedSpec[] = [
	{
		seriesId: "DEMO-KMZ01",
		calcName: "Контроль PD retail — регуляторная модель",
		readableId: "V2-DEMO-KMZ01-v1",
		author: "Иванов А.С.",
		finalCoefficient: 142.5,
		formData: {
			generalInfo: {
				calcName: "Контроль PD retail — регуляторная модель",
				businessCustomer: "Департамент розничного кредитования",
				implementationStream: "Контроль моделей",
				complexity: "3 — Повышенная ×1.50",
				channels: "Требуется",
				overallUncertainty: "Средняя",
				createIS: "Не требуется",
				createService: "Стандартный продукт",
				pilotNeed: "Требуется MVP",
			},
			uncertaintyCalculation: {
				initiativeTimeline: "Среднесрочная",
				initiativeCost: 12_500_000,
				uncertaintyAdjustment: 1.25,
				riskGroup: {
					businessComplexity: "Средний",
					defectsInSolution: "Низкий",
					adjacentProjectsImpact: "Средний",
					laborCostIncrease: "Низкий",
					thirdPartyNegligence: "Низкий",
					staffShortage: "Средний",
					sanctions: "Низкий",
					controlProceduresLack: "Средний",
					regulatoryChanges: "Высокий",
					isNotUsedAfterProject: "Низкий",
					itArchitectureChanges: "Средний",
				},
			},
			detailInfo: {
				parameters: {
					modelsCount: 2,
					algorithmType: "Табличные данные",
					algorithmCoeff: "×1.25",
					autoML: "Не требуется",
					specialist: "+10%",
					cascadeEnsemble: "Нет",
				},
				sourceSystems: [
					{
						name: "CRM Retail DWH",
						type: "Внутренний",
						daptRegistry: "Есть",
						requirements: "Понятны",
						additionalUncertainty: "Нет",
						integrationReadiness: "Готов к интеграции",
						dataCoeff: "Нет",
						nda: "Нет",
					},
					{
						name: "БКИ внешний",
						type: "Внешний",
						daptRegistry: "Нет",
						requirements: "Рисковые",
						additionalUncertainty: "Да",
						integrationReadiness: "Сложная интеграция",
						dataCoeff: "Да",
						nda: "Да",
					},
				],
				sourceTypicalTasks: [
					{
						name: "Подключение внутреннего источника CRM",
						reason: "IND-210",
						estimateHoursPerDay: 18,
						coefficient: 1,
						total: 18,
					},
					{
						name: "Интеграция внешнего БКИ",
						reason: "IND-210",
						estimateHoursPerDay: 32,
						coefficient: 1.2,
						total: 38.4,
					},
				],
			},
			dataObjects: {
				trainingSources: [
					{
						name: "v_train_pd_features",
						frequency: "120",
						development: "Доработка",
						integration: "Существующая",
						dataCondition: "Готовы",
						usedModels: "PD v3",
						controlKD: 5,
					},
				],
				applicationSources: [
					{
						name: "v_scoring_online",
						mode: "Онлайн",
						updateFrequency: "Ежедневно",
						development: "Не нужна",
						controlKD: 3,
						usedModels: "PD v3",
					},
				],
			},
			dataProcessing: {
				sourcesRDS: 4,
				consumers: 2,
				otherMicroservices: 1,
				filters: 6,
				yaspArtifact: true,
			},
			models: {
				cascadeEnsemble: "Нет",
				recalibrationType: "Частичная",
				modelsList: [
					{
						name: "PD retail baseline",
						class: "Розничный бизнес",
						taskType: "Бинарная классификация",
						algorithm: "Табличные данные",
						autoML: "Нет",
						role: "Независимая",
						trainingSources: ["v_train_pd_features"],
						applicationSources: ["v_scoring_online"],
					},
				],
			},
			summary: {
				baseScoreStream: 980,
				scoreWithComplexityCoeff: 1176,
				deviationFromBaseline: 20,
				platformStreams: platformStreams([
					{
						streamName: "Контроль моделей",
						baseTypicalScore: 420,
						adjustedTypicalScore: 504,
						deviationPercent: 20,
						atypicalScore: 45,
					},
					{
						streamName: "Источники данных",
						baseTypicalScore: 180,
						adjustedTypicalScore: 216,
						deviationPercent: 20,
						atypicalScore: 0,
					},
					{
						streamName: "ML-платформа",
						baseTypicalScore: 380,
						adjustedTypicalScore: 456,
						deviationPercent: 20,
						atypicalScore: 12,
					},
				]),
				detailedCalculation: e2eStages([
					{
						stageName: "01 Инициация",
						baseScore: 80,
						complexityCoeff: 96,
						deviationFromBase: 20,
					},
					{
						stageName: "02 Проектирование",
						baseScore: 160,
						complexityCoeff: 192,
						deviationFromBase: 20,
					},
					{
						stageName: "03 Разработка",
						baseScore: 420,
						complexityCoeff: 504,
						deviationFromBase: 20,
					},
				]),
			},
		},
		extraVersions: [
			{
				version: "2",
				readableId: "V2-DEMO-KMZ01-v2",
				author: "Петрова М.В.",
				finalCoefficient: 138.2,
				formData: {
					generalInfo: {
						calcName: "Контроль PD retail — регуляторная модель",
						businessCustomer: "Департамент розничного кредитования",
						implementationStream: "Контроль моделей",
						complexity: "2 — Средняя ×1.25",
						channels: "Требуется",
						overallUncertainty: "Низкая",
						createIS: "Не требуется",
						createService: "Стандартный продукт",
						pilotNeed: "Не требуется",
					},
					summary: {
						baseScoreStream: 920,
						scoreWithComplexityCoeff: 1058,
						deviationFromBaseline: 15,
						platformStreams: platformStreams([
							{
								streamName: "Контроль моделей",
								baseTypicalScore: 400,
								adjustedTypicalScore: 460,
								deviationPercent: 15,
								atypicalScore: 30,
							},
						]),
						detailedCalculation: e2eStages([
							{
								stageName: "03 Разработка",
								baseScore: 380,
								complexityCoeff: 437,
								deviationFromBase: 15,
							},
						]),
					},
				},
			},
		],
	},
	{
		seriesId: "DEMO-IND02",
		calcName: "Интеграция источников — CRM и DWH",
		readableId: "V2-DEMO-IND02-v1",
		author: "Сидоров К.Л.",
		finalCoefficient: 118.4,
		formData: {
			generalInfo: {
				calcName: "Интеграция источников — CRM и DWH",
				businessCustomer: "Управление данными",
				implementationStream: "Источники данных",
				complexity: "2 — Средняя ×1.25",
				channels: "Не требуется",
				overallUncertainty: "Повышенная",
				createIS: "Требуется",
				createService: "Не требуется",
				pilotNeed: "Требуется MVP",
			},
			detailInfo: {
				parameters: {
					modelsCount: 0,
					algorithmType: "Табличные данные",
					algorithmCoeff: "×1.00",
					autoML: "Не требуется",
					specialist: "+0%",
					cascadeEnsemble: "Нет",
				},
				sourceSystems: [
					{
						name: "SAP CRM",
						type: "Внутренний",
						daptRegistry: "Есть",
						requirements: "Не понятны",
						additionalUncertainty: "Да",
						integrationReadiness: "Нужны доработки ИС",
						dataCoeff: "Да",
						nda: "Нет",
					},
					{
						name: "Корпоративное DWH",
						type: "Внутренний",
						daptRegistry: "Есть",
						requirements: "Понятны",
						additionalUncertainty: "Нет",
						integrationReadiness: "Готов к интеграции",
						dataCoeff: "Нет",
						nda: "Нет",
					},
					{
						name: "Внешний скоринговый bureau",
						type: "Внешний",
						daptRegistry: "Нет",
						requirements: "Рисковые",
						additionalUncertainty: "Да",
						integrationReadiness: "Сложная интеграция",
						dataCoeff: "Да",
						nda: "Да",
					},
				],
				sourceTypicalTasks: [
					{
						name: "Проработка требований SAP CRM",
						total: 24,
					},
					{
						name: "Подключение DWH витрины",
						total: 16,
					},
				],
			},
			dataObjects: {
				trainingSources: [
					{
						name: "dm_crm_clients",
						frequency: "85",
						development: "С нуля",
						integration: "Новая",
						dataCondition: "Требует очистки",
						usedModels: "—",
						controlKD: 8,
					},
				],
				applicationSources: [],
			},
			summary: {
				baseScoreStream: 640,
				scoreWithComplexityCoeff: 768,
				deviationFromBaseline: 20,
				platformStreams: platformStreams([
					{
						streamName: "Источники данных",
						baseTypicalScore: 520,
						adjustedTypicalScore: 624,
						deviationPercent: 20,
						atypicalScore: 55,
					},
				]),
				detailedCalculation: e2eStages([
					{
						stageName: "02 Проектирование",
						baseScore: 200,
						complexityCoeff: 240,
						deviationFromBase: 20,
					},
				]),
			},
		},
	},
	{
		seriesId: "DEMO-MLP03",
		calcName: "AutoML-платформа — прогноз оттока",
		readableId: "V2-DEMO-MLP03-v1",
		author: "Козлова Е.П.",
		finalCoefficient: 156.8,
		formData: {
			generalInfo: {
				calcName: "AutoML-платформа — прогноз оттока",
				businessCustomer: "CRM Marketing",
				implementationStream: "ML-платформа",
				complexity: "4 — Высокая ×2.00",
				channels: "Требуется",
				overallUncertainty: "Высокая",
				createIS: "Не требуется",
				createService: "Стандартный продукт",
				pilotNeed: "Требуется MVP",
			},
			detailInfo: {
				parameters: {
					modelsCount: 3,
					algorithmType: "Временные ряды",
					algorithmCoeff: "×1.50",
					autoML: "Требуется",
					specialist: "+20%",
					cascadeEnsemble: "Да",
				},
				sourceSystems: [
					{
						name: "Event stream Kafka",
						type: "Внутренний",
						daptRegistry: "Есть",
						requirements: "Понятны",
						additionalUncertainty: "Нет",
						integrationReadiness: "Готов к интеграции",
						dataCoeff: "Нет",
						nda: "Нет",
					},
				],
				sourceTypicalTasks: [],
			},
			models: {
				cascadeEnsemble: "Да",
				recalibrationType: "Полная рекалибровка",
				modelsList: [
					{
						name: "Churn LGBM",
						class: "Розничный бизнес",
						taskType: "Бинарная классификация",
						algorithm: "Табличные данные",
						autoML: "Да",
						role: "Оркестратор",
					},
					{
						name: "Churn backup XGB",
						class: "Розничный бизнес",
						taskType: "Бинарная классификация",
						algorithm: "Табличные данные",
						autoML: "Нет",
						role: "Подчинённая",
					},
				],
			},
			mlPlatform: {
				param1: "GPU pool",
				param2: "Feature store",
				typicalTasks: [
					{
						name: "Настройка AutoML pipeline",
						total: 40,
					},
				],
			},
			summary: {
				baseScoreStream: 1120,
				scoreWithComplexityCoeff: 1792,
				deviationFromBaseline: 60,
				platformStreams: platformStreams([
					{
						streamName: "ML-платформа",
						baseTypicalScore: 680,
						adjustedTypicalScore: 1088,
						deviationPercent: 60,
						atypicalScore: 80,
					},
					{
						streamName: "Модели",
						baseTypicalScore: 440,
						adjustedTypicalScore: 704,
						deviationPercent: 60,
						atypicalScore: 25,
					},
				]),
				detailedCalculation: e2eStages([
					{
						stageName: "04 Тестирование",
						baseScore: 280,
						complexityCoeff: 448,
						deviationFromBase: 60,
					},
				]),
			},
		},
	},
	{
		seriesId: "DEMO-CAS04",
		calcName: "Каскад collection — ансамбль моделей",
		readableId: "V2-DEMO-CAS04-v1",
		author: "Новиков Д.И.",
		finalCoefficient: 171.3,
		formData: {
			generalInfo: {
				calcName: "Каскад collection — ансамбль моделей",
				businessCustomer: "Collection",
				implementationStream: "Контроль моделей",
				complexity: "4 — Высокая ×2.00",
				channels: "Требуется",
				overallUncertainty: "Средняя",
				createIS: "Не требуется",
				createService: "Стандартный продукт",
				pilotNeed: "Не требуется",
			},
			detailInfo: {
				parameters: {
					modelsCount: 4,
					algorithmType: "Табличные данные",
					algorithmCoeff: "×1.50",
					autoML: "Требуется",
					specialist: "+20%",
					cascadeEnsemble: "Да",
				},
				sourceSystems: [
					{
						name: "Collection DWH",
						type: "Внутренний",
						daptRegistry: "Есть",
						requirements: "Понятны",
						additionalUncertainty: "Нет",
						integrationReadiness: "Готов к интеграции",
						dataCoeff: "Нет",
						nda: "Нет",
					},
				],
				sourceTypicalTasks: [
					{
						name: "Настройка мониторинга витрины",
						total: 12,
					},
				],
			},
			models: {
				cascadeEnsemble: "Да",
				recalibrationType: "Частичная",
				modelsList: [
					{
						name: "Soft collection",
						class: "Прочий",
						taskType: "Бинарная классификация",
						algorithm: "Табличные данные",
						autoML: "Нет",
						role: "Подчинённая",
					},
					{
						name: "Hard collection orchestrator",
						class: "Прочий",
						taskType: "Ранжирование",
						algorithm: "Табличные данные",
						autoML: "Да",
						role: "Оркестратор",
					},
				],
			},
			summary: {
				baseScoreStream: 1050,
				scoreWithComplexityCoeff: 1680,
				deviationFromBaseline: 60,
				platformStreams: platformStreams([
					{
						streamName: "Контроль моделей",
						baseTypicalScore: 550,
						adjustedTypicalScore: 880,
						deviationPercent: 60,
						atypicalScore: 70,
					},
				]),
				detailedCalculation: e2eStages([
					{
						stageName: "03 Разработка",
						baseScore: 500,
						complexityCoeff: 800,
						deviationFromBase: 60,
					},
				]),
			},
		},
	},
	{
		seriesId: "DEMO-RISK05",
		calcName: "Оценка регуляторных рисков — корпоративный портфель",
		readableId: "V2-DEMO-RISK05-v1",
		author: "Морозова А.В.",
		finalCoefficient: 129.6,
		formData: {
			generalInfo: {
				calcName: "Оценка регуляторных рисков — корпоративный портфель",
				businessCustomer: "Корпоративный блок",
				implementationStream: "Контроль моделей",
				complexity: "3 — Повышенная ×1.50",
				channels: "Не требуется",
				overallUncertainty: "Повышенная",
				createIS: "Требуется",
				createService: "Не требуется",
				pilotNeed: "Требуется MVP",
			},
			uncertaintyCalculation: {
				initiativeTimeline: "Долгосрочная",
				initiativeCost: 28_000_000,
				uncertaintyAdjustment: 1.4,
				riskGroup: {
					businessComplexity: "Высокий",
					regulatoryChanges: "Высокий",
					itArchitectureChanges: "Высокий",
				},
			},
			detailInfo: {
				sourceSystems: [
					{
						name: "Кредитный конвейер КИБ",
						type: "Внутренний",
						daptRegistry: "Есть",
						requirements: "Не понятны",
						additionalUncertainty: "Да",
						integrationReadiness: "Нужны доработки ИС",
						dataCoeff: "Да",
						nda: "Нет",
					},
				],
				sourceTypicalTasks: [
					{
						name: "Согласование структуры логов",
						total: 20,
					},
				],
			},
			dataProcessing: {
				sourcesRDS: 6,
				consumers: 3,
				otherMicroservices: 2,
				filters: 10,
				yaspArtifact: false,
			},
			summary: {
				baseScoreStream: 860,
				scoreWithComplexityCoeff: 1118,
				deviationFromBaseline: 30,
				platformStreams: platformStreams([
					{
						streamName: "Контроль моделей",
						baseTypicalScore: 480,
						adjustedTypicalScore: 624,
						deviationPercent: 30,
						atypicalScore: 90,
					},
					{
						streamName: "Хранение и обработка",
						baseTypicalScore: 220,
						adjustedTypicalScore: 286,
						deviationPercent: 30,
						atypicalScore: 15,
					},
				]),
				detailedCalculation: e2eStages([
					{
						stageName: "01 Инициация",
						baseScore: 120,
						complexityCoeff: 156,
						deviationFromBase: 30,
					},
					{
						stageName: "05 Внедрение",
						baseScore: 340,
						complexityCoeff: 442,
						deviationFromBase: 30,
					},
				]),
			},
		},
	},
];
