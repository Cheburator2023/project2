import type {
	V2JsonLogicValue,
	V2LogicGraphDto,
	V2LogicRuleDto,
} from "@smart-anketa/api-contract";
import {
	CONTROL_TYPICAL_TASKS,
	SOURCE_GROUP_COEFFICIENT_LOGIC,
	SOURCE_TYPICAL_TASKS,
} from "./v2-source-works.builder";

/**
 * Заводская «логика» к эталонной схеме (`v2-default-anketa.snapshot.json`).
 *
 * Единый расчёт (ФТ-024/025): итог типовой работы = норматив × коэффициент группы
 * (произведение весов параметров). Нормативы и веса берутся из каталога методолога
 * (`работы.csv` / `справочники.csv` через `v2-source-works.builder`), а не хардкодятся.
 * Все правила редактируются через админку (вкладка «Логика»).
 *
 * Правила единого расчёта помечены `payload.calcModel = "unified"`: для таких
 * шаблонов backend не запускает legacy v1-движок этапов (см. V2CalculationService).
 * Старые версии без флага продолжают считаться legacy — v1-расчёты не ломаются.
 */
function rule(id: string, patch: Omit<V2LogicRuleDto, "id">): V2LogicRuleDto {
	return { id, ...patch };
}

const UNIFIED = { calcModel: "unified" } as const;

const SUM_SOURCE_TYPICAL_TOTAL: V2JsonLogicValue = {
	reduce: [
		{ var: "streamDataSources.sourceTypicalTasks" },
		{ "+": [{ var: "accumulator" }, { max: [0, { var: "current.total" }] }] },
		0,
	],
};

const SUM_CONTROL_TYPICAL_TOTAL: V2JsonLogicValue = {
	reduce: [
		{ var: "streamModelControl.control.controlTypicalTasks" },
		{ "+": [{ var: "accumulator" }, { max: [0, { var: "current.total" }] }] },
		0,
	],
};

/** Σ atypical totals, отфильтрованных флагом includeInCalculation. */
function sumAtypicalIncluded(arrayPath: string): V2JsonLogicValue {
	return {
		reduce: [
			{ var: arrayPath },
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
}

/** Per-row JsonLogic: total = estimateHoursPerDay * coefficient. */
const ROW_TASK_TOTAL: V2JsonLogicValue = {
	"*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }],
};

export const V2_DEFAULT_LOGIC_RULES: V2LogicRuleDto[] = [
	rule("default-hint-overall-uncertainty", {
		kind: "hint",
		targetPath: "/uncertaintyCalculation/uncertaintyAdjustment",
		dependencies: [],
		condition: true,
		payload: {
			text:
				"Общая неопределённость: сумма коэффициентов риска по группам рисков " +
				"плюс корректировка процентом (uncertaintyAdjustment / 100).",
		},
		description: "Подсказка про общую неопределённость.",
	}),

	// --- Per-row итоги (норматив × коэффициент группы) -----------------------
	rule("default-row-source-typical-task-total", {
		kind: "row_computed",
		targetPath: "/streamDataSources/sourceTypicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "streamDataSources.sourceTypicalTasks",
			fieldVar: "total",
			label: "Per-row итог типовой работы источника (ФТ-024)",
			formulaHint:
				"row.total = норматив (ч/д) × коэффициент группы источника. Норматив из работы.csv.",
		},
		description: "ФТ-024: итог строки типовой работы источника данных.",
	}),

	rule("default-row-atypical-ds-task-total", {
		kind: "row_computed",
		targetPath: "/streamDataSources/atypicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "streamDataSources.atypicalTasks",
			fieldVar: "total",
			label: "Per-row итог нетиповой работы (источники данных)",
			formulaHint: "row.total = базовая оценка × коэффициент. ФТ-022.",
		},
		description: "Расчёт total строки нетиповых работ стрима «Источники данных».",
	}),

	rule("default-row-atypical-task-total", {
		kind: "row_computed",
		targetPath: "/streamModelControl/atypicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "streamModelControl.atypicalTasks",
			fieldVar: "total",
			label: "Per-row итог нетиповой работы",
			formulaHint: "row.total = базовая оценка × коэффициент. ФТ-022.",
		},
		description: "Расчёт total строки нетиповых работ.",
	}),

	// --- Триггер типовых работ по источникам (каталог, реальные нормативы) ---
	rule("unified-source-typical-works", {
		kind: "task_trigger",
		targetPath: "/streamDataSources/sourceTypicalTasks",
		dependencies: ["/streamDataSources/sourceSystems"],
		condition: true,
		payload: {
			...UNIFIED,
			mode: "generated_rows",
			sourceArrayPath: "streamDataSources.sourceSystems",
			outputArrayPath: "streamDataSources.sourceTypicalTasks",
			taskCode: "IND_SOURCE_TASKS",
			label: "Типовые работы (стрим «Источники данных»)",
			hint:
				"Глоссарий «Справочник типовых работ»: при добавлении компонента «Система-источник» " +
				"тип источника (внутренний/внешний) подтягивает типовые работы этапов из работы.csv " +
				"с нормативами; коэффициент группы = произведение весов параметров источника (ФТ-024).",
			coefficientLogic: SOURCE_GROUP_COEFFICIENT_LOGIC,
			tasks: SOURCE_TYPICAL_TASKS,
		},
		description:
			"ФТ-024/027: генерация типовых работ компонента «Система-источник» из каталога.",
	}),

	rule("unified-control-row-total", {
		kind: "row_computed",
		targetPath: "/streamModelControl/control/controlTypicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "streamModelControl.control.controlTypicalTasks",
			fieldVar: "total",
			label: "Per-row итог работы контроля моделей",
			formulaHint:
				"row.total = норматив контроля (ч/д, справочник №40) × коэффициент.",
		},
		description: "ФТ-024: итог строки работы контроля моделей.",
	}),

	rule("unified-control-typical-works", {
		kind: "task_trigger",
		targetPath: "/streamModelControl/control/controlTypicalTasks",
		dependencies: ["/streamModelControl/control/controlTypes"],
		condition: true,
		payload: {
			...UNIFIED,
			mode: "generated_rows",
			sourceArrayPath: "streamModelControl.control.controlTypes",
			outputArrayPath: "streamModelControl.control.controlTypicalTasks",
			taskCode: "CONTROL_TASKS",
			label: "Типовые работы (стрим «Контроль моделей»)",
			hint:
				"Глоссарий «Контроль модели»: выбранные виды контроля (справочник №3) " +
				"подтягивают работы. Нормативы ч/д — из матрицы №40 по классу модели (задаёт методолог).",
			tasks: CONTROL_TYPICAL_TASKS,
		},
		description: "Контроль моделей: генерация работ по выбранным видам контроля.",
	}),

	// --- Единая итоговая калькуляция (ФТ-026) --------------------------------
	rule("unified-typical-total", {
		kind: "computed",
		targetPath: "/summary/typicalTotal",
		dependencies: [
			"/streamDataSources/sourceTypicalTasks",
			"/streamModelControl/control/controlTypicalTasks",
		],
		condition: {
			"+": [SUM_SOURCE_TYPICAL_TOTAL, SUM_CONTROL_TYPICAL_TOTAL],
		},
		payload: {
			...UNIFIED,
			mode: "expert",
			role: "typical_total",
			label: "Сумма по типовым работам",
			formulaHint:
				"Σ источники + Σ контроль моделей (sourceTypicalTasks + controlTypicalTasks).",
		},
		description: "ФТ-026: сумма итоговых оценок типовых работ.",
	}),

	rule("unified-atypical-total", {
		kind: "computed",
		targetPath: "/summary/atypicalTotal",
		dependencies: [
			"/streamDataSources/atypicalTasks",
			"/streamModelControl/atypicalTasks",
		],
		condition: {
			"+": [
				sumAtypicalIncluded("streamDataSources.atypicalTasks"),
				sumAtypicalIncluded("streamModelControl.atypicalTasks"),
			],
		},
		payload: {
			...UNIFIED,
			mode: "expert",
			role: "atypical_total",
			label: "Сумма по нетиповым работам (включённым)",
			formulaHint:
				"Σ (streamDataSources.atypicalTasks + streamModelControl.atypicalTasks) где includeInCalculation = true.",
		},
		description: "ФТ-026: сумма итоговых оценок нетиповых работ.",
	}),

	rule("unified-grand-total", {
		kind: "computed",
		targetPath: "/summary/total",
		dependencies: ["/summary/typicalTotal", "/summary/atypicalTotal"],
		condition: {
			"+": [
				{ var: "summary.typicalTotal" },
				{ var: "summary.atypicalTotal" },
			],
		},
		payload: {
			...UNIFIED,
			mode: "expert",
			role: "grand_total",
			label: "Итоговая оценка трудоёмкости (Total)",
			formulaHint:
				"summary.total = summary.typicalTotal + summary.atypicalTotal. ФТ-026.",
		},
		description: "ФТ-026: совокупная итоговая калькуляция анкеты.",
	}),
];

export const V2_DEFAULT_LOGIC_GRAPH: V2LogicGraphDto = {
	rules: V2_DEFAULT_LOGIC_RULES,
};
