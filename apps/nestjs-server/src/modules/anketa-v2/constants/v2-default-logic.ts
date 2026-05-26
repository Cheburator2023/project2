import type {
	V2JsonLogicValue,
	V2LogicGraphDto,
	V2LogicRuleDto,
} from "@smart-anketa/api-contract";

/**
 * Заводская «логика» к эталонной схеме (`v2-default-anketa.snapshot.json`).
 *
 * Цель — перенести расчёт оценки трудоёмкости из v1
 * (`apps/react-client/src/features/anketaCRUD/calculations/*`) в данные шаблона,
 * чтобы все коэффициенты/формулы редактировались через админку, а интерпретация
 * шла на бекенде по правилам JsonLogic.
 *
 * Маппинг v1 → v2 (поля эталонной схемы):
 *  • base/stage values: `mlPlatform.typicalTasks[].total` (Σ → `summary.baseScoreStream`).
 *  • нетиповые: `atypicalTasks[].total` × `includeInCalculation` (Σ).
 *  • итог с коэф. сложности: `summary.scoreWithComplexityCoeff`.
 *  • отклонение: `summary.deviationFromBaseline = scoreWithComplexityCoeff - baseScoreStream`.
 *  • коэффициент алгоритма (ФТ-014): `detailInfo.parameters.algorithmCoeff` (выбор пользователем
 *    из справочника, см. v1 `calculateAlgorithmComplexityCoefficient`).
 *  • общая неопределённость (v1 `calculateTotalUncertainty`): пока хранится в
 *    `uncertaintyCalculation.uncertaintyAdjustment` (числовая корректировка).
 *
 * Per-row расчёт (`row_computed`) и агрегаты (`computed`) выполняются на бекенде
 * (`V2CalculationService.evaluate`); редактор и /read вызывают POST /calculate.
 *
 * Все правила задают `payload.label/role/formulaHint` для UI калькуляции
 * (`SchemaCalculationPanel`) и `weightSourceLabel` для тултипа источника (ФТ-014).
 */
function rule(id: string, patch: Omit<V2LogicRuleDto, "id">): V2LogicRuleDto {
	return { id, ...patch };
}

/** Σ task.total по массиву (читает `current.total` в reduce JsonLogic). */
const SUM_TASK_TOTAL: V2JsonLogicValue = {
	reduce: [
		{ var: "mlPlatform.typicalTasks" },
		{
			"+": [{ var: "accumulator" }, { max: [0, { var: "current.total" }] }],
		},
		0,
	],
};

/** Маппинг v1 (calculateAlgorithmComplexityCoefficient) на v2 enum типов алгоритма. */
const ALGORITHM_TYPE_TO_COEFF: V2JsonLogicValue = {
	if: [
		{
			"==": [
				{ var: "detailInfo.parameters.algorithmType" },
				"Табличные данные",
			],
		},
		0.75,
		{
			"==": [{ var: "detailInfo.parameters.algorithmType" }, "Временные ряды"],
		},
		1.0,
		{ "==": [{ var: "detailInfo.parameters.algorithmType" }, "NLP"] },
		1.25,
		{ "==": [{ var: "detailInfo.parameters.algorithmType" }, "CV"] },
		1.8,
		{ "==": [{ var: "detailInfo.parameters.algorithmType" }, "RL"] },
		2.5,
		1.0,
	],
};

/** Per-row JsonLogic: total = estimateHoursPerDay * coefficient. */
const ROW_TASK_TOTAL: V2JsonLogicValue = {
	"*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }],
};

const SUM_SOURCE_TYPICAL_TOTAL: V2JsonLogicValue = {
	reduce: [
		{ var: "detailInfo.sourceTypicalTasks" },
		{
			"+": [{ var: "accumulator" }, { max: [0, { var: "current.total" }] }],
		},
		0,
	],
};

/** Σ atypical totals, отфильтрованных флагом includeInCalculation. */
const SUM_ATYPICAL_INCLUDED: V2JsonLogicValue = {
	reduce: [
		{ var: "atypicalTasks" },
		{
			"+": [
				{ var: "accumulator" },
				{
					if: [
						{ var: "current.includeInCalculation" },
						{ max: [0, { var: "current.total" }] },
						0,
					],
				},
			],
		},
		0,
	],
};

const IND_210_BASE_TASKS = [
	["REQ", "Уточнение требований, сбор первичной информации", 1],
	["SEARCH", "Исследование Источника/Поиск Данных", 2],
	["QUALITY", "Анализ Данных/Связок/Проверка качества", 3],
	["COUNTERPARTY", "Проработка вопросов с контрагентами", 3],
	["EXPORT", "Организация выгрузок", 2],
	["NOTE", "Оформление Аналитической Записки", 1],
	["ISSUES", "Расследование проблем с качеством/контроль устранения", 2],
] as const;

const DATA_SOURCE_TYPICAL_TASKS = [
	...IND_210_BASE_TASKS.flatMap(([code, name, estimateHoursPerDay]) => [
		{
			taskCode: `IND210_${code}_REPLICA`,
			name,
			reason: "Этап 210, источник с репликой в ДАПП",
			estimateHoursPerDay,
			coefficient: 1,
			match: { daptRegistry: "Есть" },
		},
		{
			taskCode: `IND210_${code}_NO_REPLICA`,
			name,
			reason: "Этап 210, источник без реплики в ДАПП",
			estimateHoursPerDay,
			coefficient: 1.5,
			match: { daptRegistry: "Нет" },
		},
	]),
	{
		taskCode: "IND210_UNCLEAR_REQ",
		name: "Доп. сбор требований/аналитика по источнику",
		reason: "Этап 210, требования по источнику не понятны",
		estimateHoursPerDay: 14,
		coefficient: 0.3,
		match: { requirements: ["Не понятны", "Рисковые"] },
	},
	{
		taskCode: "IND210_EXTRA_UNKNOWN",
		name: "Доп. неопределённый источник/тематика",
		reason: "Этап 210, риск привнесения новых требований",
		estimateHoursPerDay: 14,
		coefficient: 1.5,
		match: { additionalUncertainty: "Да" },
	},
	{
		taskCode: "IND211_INTEGRATION_READY",
		name: "БТ на интеграцию источника в ПД",
		reason: "Этап 211, высокая готовность + простая архитектура",
		estimateHoursPerDay: 22,
		coefficient: 0.5,
		match: { integrationReadiness: "Готов к интеграции" },
	},
	{
		taskCode: "IND211_INTEGRATION_REVISION",
		name: "БТ на интеграцию источника в ПД",
		reason: "Этап 211, нужны доработки ИС + простая архитектура",
		estimateHoursPerDay: 22,
		coefficient: 0.8,
		match: { integrationReadiness: "Нужны доработки ИС" },
	},
	{
		taskCode: "IND211_INTEGRATION_COMPLEX",
		name: "БТ на интеграцию источника в ПД",
		reason: "Этап 211, сложная интеграция",
		estimateHoursPerDay: 22,
		coefficient: 1.2,
		match: { integrationReadiness: "Сложная интеграция" },
	},
];

export const V2_DEFAULT_LOGIC_RULES: V2LogicRuleDto[] = [
	rule("default-hint-algorithm-coeff", {
		kind: "hint",
		targetPath: "/detailInfo/parameters/algorithmCoeff",
		dependencies: [],
		condition: true,
		payload: {
			text:
				"Коэффициент сложности алгоритма (ФТ-014). " +
				"В v1 рассчитывался как сумма весов по справочнику типов алгоритмов: " +
				"Табличные ×0.75, Временные ряды ×1.0, NLP ×1.25, CV ×1.4, RL ×1.6, " +
				"Оптимизация ×2.5, Гео ×3.0, Граф ×3.5.",
		},
		description: "ФТ-014: подсказка про источник веса коэффициента алгоритма.",
	}),

	rule("default-hint-overall-uncertainty", {
		kind: "hint",
		targetPath: "/uncertaintyCalculation/uncertaintyAdjustment",
		dependencies: [],
		condition: true,
		payload: {
			text:
				"Общая неопределённость (v1 `calculateTotalUncertainty`). " +
				"Рассчитывается как сумма коэффициентов риска (низкий 0.03 / средний 0.05 / высокий 0.07 / очень высокий 0.10) " +
				"плюс корректировка процентом (uncertaintyAdjustment / 100), базовое значение 1.",
		},
		description: "Подсказка про общую неопределённость (v1 formula).",
	}),

	rule("default-computed-base-score-stream", {
		kind: "computed",
		targetPath: "/summary/baseScoreStream",
		dependencies: ["/mlPlatform/typicalTasks", "/detailInfo/sourceTypicalTasks"],
		condition: { "+": [SUM_TASK_TOTAL, SUM_SOURCE_TYPICAL_TOTAL] },
		payload: {
			mode: "expert",
			role: "typical_total",
			label: "Базовая оценка по стриму (Σ типовых работ)",
			formulaHint:
				"Σ mlPlatform.typicalTasks[].total + Σ detailInfo.sourceTypicalTasks[].total. Источники данных берутся из IND.",
			weightSourceLabel:
				"Справочник типовых работ + per-row coefficient (источник: schema mlPlatform.typicalTasks и IND/sourceSystems).",
		},
		description: "ФТ-026: база по стриму.",
	}),

	rule("default-row-typical-task-total", {
		kind: "row_computed",
		targetPath: "/mlPlatform/typicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "mlPlatform.typicalTasks",
			fieldVar: "total",
			label: "Per-row total типовых работ",
			formulaHint:
				"row.total = row.estimateHoursPerDay × row.coefficient. ФТ-016.",
		},
		description: "Расчёт total строки таблицы типовых работ.",
	}),

	rule("default-row-source-typical-task-total", {
		kind: "row_computed",
		targetPath: "/detailInfo/sourceTypicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "detailInfo.sourceTypicalTasks",
			fieldVar: "total",
			label: "Per-row total типовых работ источников данных",
			formulaHint:
				"row.total = row.estimateHoursPerDay × row.coefficient. Источник: IND, этапы 210/211.",
		},
		description: "Расчёт total строки типовых работ по источникам данных.",
	}),

	rule("default-row-atypical-task-total", {
		kind: "row_computed",
		targetPath: "/atypicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "atypicalTasks",
			fieldVar: "total",
			label: "Per-row total нетиповых работ",
			formulaHint:
				"row.total = row.estimateHoursPerDay × row.coefficient. ФТ-021.",
		},
		description: "Расчёт total строки таблицы нетиповых работ.",
	}),

	rule("default-computed-algorithm-coeff-value", {
		kind: "computed",
		targetPath: "/detailInfo/parameters/algorithmCoeffValue",
		dependencies: ["/detailInfo/parameters/algorithmType"],
		condition: ALGORITHM_TYPE_TO_COEFF,
		payload: {
			mode: "expert",
			role: "coefficient",
			label: "Коэффициент сложности алгоритма",
			weightSourceLabel:
				"v1 calculateAlgorithmComplexityCoefficient (Табличные ×0.75, Временные ряды ×1.0, NLP ×1.25, CV ×1.8, RL ×2.5)",
			formulaHint:
				"map algorithmType → coefficient (источник: v1, можно править в правиле).",
		},
		description: "ФТ-014: числовой коэффициент алгоритма (для расчёта).",
	}),

	rule("default-computed-score-with-complexity", {
		kind: "computed",
		targetPath: "/summary/scoreWithComplexityCoeff",
		dependencies: [
			"/summary/baseScoreStream",
			"/atypicalTasks",
			"/detailInfo/parameters/algorithmCoeffValue",
		],
		condition: {
			"*": [
				{
					"+": [{ var: "summary.baseScoreStream" }, SUM_ATYPICAL_INCLUDED],
				},
				{
					if: [
						{ ">": [{ var: "detailInfo.parameters.algorithmCoeffValue" }, 0] },
						{ var: "detailInfo.parameters.algorithmCoeffValue" },
						1,
					],
				},
			],
		},
		payload: {
			mode: "expert",
			role: "grand_total",
			label: "Итог: (база + нетиповые) × коэф. сложности",
			formulaHint:
				"(summary.baseScoreStream + Σ atypicalTasks[].total*includeInCalculation) × detailInfo.parameters.algorithmCoeffValue. ФТ-021 + ФТ-026.",
		},
		description: "ФТ-021/026: итоговая оценка с учётом коэф. алгоритма.",
	}),

	rule("default-computed-deviation-from-baseline", {
		kind: "computed",
		targetPath: "/summary/deviationFromBaseline",
		dependencies: [
			"/summary/scoreWithComplexityCoeff",
			"/summary/baseScoreStream",
		],
		condition: {
			if: [
				{ ">": [{ var: "summary.baseScoreStream" }, 0] },
				{
					"-": [
						{
							"*": [
								{
									"/": [
										{ var: "summary.scoreWithComplexityCoeff" },
										{ var: "summary.baseScoreStream" },
									],
								},
								100,
							],
						},
						100,
					],
				},
				0,
			],
		},
		payload: {
			mode: "expert",
			role: "other",
			label: "Отклонение от базовой оценки, %",
			formulaHint:
				"(scoreWithComplexityCoeff / baseScoreStream − 1) × 100. Перезаписывается legacy-расчётом этапов v1.",
		},
		description: "ФТ-027: отклонение от базовой оценки в процентах.",
	}),

	rule("default-task-trigger-pilot-required", {
		kind: "task_trigger",
		targetPath: "/mlPlatform/typicalTasks",
		dependencies: ["/generalInfo/pilotNeed"],
		condition: {
			"==": [{ var: "generalInfo.pilotNeed" }, "Требуется"],
		},
		payload: {
			taskCode: "PILOT_SUPPORT",
			label: "Сопровождение пилота",
			hint:
				"ФТ-016: формирует типовую работу 'Сопровождение пилота' при " +
				"generalInfo.pilotNeed = 'Требуется'.",
		},
		description: "Пример триггера типовой работы (ФТ-016).",
	}),

	rule("default-task-trigger-data-source-typical-tasks", {
		kind: "task_trigger",
		targetPath: "/detailInfo/sourceTypicalTasks",
		dependencies: ["/detailInfo/sourceSystems"],
		condition: true,
		payload: {
			mode: "generated_rows",
			sourceArrayPath: "detailInfo.sourceSystems",
			outputArrayPath: "detailInfo.sourceTypicalTasks",
			taskCode: "IND_SOURCE_TASKS",
			label: "Типовые работы по источникам данных",
			hint:
				"IND: при добавлении арх. компонента 'Источник данных' выбранные ручные параметры источника генерируют типовые работы этапов 210/211.",
			tasks: DATA_SOURCE_TYPICAL_TASKS,
		},
		description: "IND: генерация типовых работ по арх. компоненту Источник данных.",
	}),
];

export const V2_DEFAULT_LOGIC_GRAPH: V2LogicGraphDto = {
	rules: V2_DEFAULT_LOGIC_RULES,
};
