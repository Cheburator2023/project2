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

/** Σ task.total по массиву (читает `current.total` в reduce JsonLogic). */
const SUM_TASK_TOTAL: V2JsonLogicValue = {
	reduce: [
		{ var: "mlPlatform.typicalTasks" },
		{ "+": [{ var: "accumulator" }, { max: [0, { var: "current.total" }] }] },
		0,
	],
};

const SUM_SOURCE_TYPICAL_TOTAL: V2JsonLogicValue = {
	reduce: [
		{ var: "detailInfo.sourceTypicalTasks" },
		{ "+": [{ var: "accumulator" }, { max: [0, { var: "current.total" }] }] },
		0,
	],
};

const SUM_CONTROL_TYPICAL_TOTAL: V2JsonLogicValue = {
	reduce: [
		{ var: "modelControl.controlTypicalTasks" },
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
	rule("default-row-typical-task-total", {
		kind: "row_computed",
		targetPath: "/mlPlatform/typicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "mlPlatform.typicalTasks",
			fieldVar: "total",
			label: "Per-row total типовых работ платформы",
			formulaHint: "row.total = estimateHoursPerDay × coefficient.",
		},
		description: "Расчёт total строки типовых работ платформы.",
	}),

	rule("default-row-source-typical-task-total", {
		kind: "row_computed",
		targetPath: "/detailInfo/sourceTypicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "detailInfo.sourceTypicalTasks",
			fieldVar: "total",
			label: "Per-row итог типовой работы источника (ФТ-024)",
			formulaHint:
				"row.total = норматив (ч/д) × коэффициент группы источника. Норматив из работы.csv.",
		},
		description: "ФТ-024: итог строки типовой работы источника данных.",
	}),

	rule("default-row-atypical-task-total", {
		kind: "row_computed",
		targetPath: "/atypicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "atypicalTasks",
			fieldVar: "total",
			label: "Per-row итог нетиповой работы",
			formulaHint: "row.total = базовая оценка × коэффициент. ФТ-022.",
		},
		description: "Расчёт total строки нетиповых работ.",
	}),

	// --- Триггер типовых работ по источникам (каталог, реальные нормативы) ---
	rule("unified-source-typical-works", {
		kind: "task_trigger",
		targetPath: "/detailInfo/sourceTypicalTasks",
		dependencies: ["/detailInfo/sourceSystems"],
		condition: true,
		payload: {
			...UNIFIED,
			mode: "generated_rows",
			sourceArrayPath: "detailInfo.sourceSystems",
			outputArrayPath: "detailInfo.sourceTypicalTasks",
			taskCode: "IND_SOURCE_TASKS",
			label: "Типовые работы по источникам данных (стрим «Источники данных»)",
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
		targetPath: "/modelControl/controlTypicalTasks",
		dependencies: [],
		condition: ROW_TASK_TOTAL,
		payload: {
			arrayPath: "modelControl.controlTypicalTasks",
			fieldVar: "total",
			label: "Per-row итог работы контроля моделей",
			formulaHint:
				"row.total = норматив контроля (ч/д, справочник №40) × коэффициент.",
		},
		description: "ФТ-024: итог строки работы контроля моделей.",
	}),

	rule("unified-control-typical-works", {
		kind: "task_trigger",
		targetPath: "/modelControl/controlTypicalTasks",
		dependencies: ["/modelControl/controlTypes"],
		condition: true,
		payload: {
			...UNIFIED,
			mode: "generated_rows",
			sourceArrayPath: "modelControl.controlTypes",
			outputArrayPath: "modelControl.controlTypicalTasks",
			taskCode: "CONTROL_TASKS",
			label: "Работы по контролю моделей (стрим «Контроль моделей»)",
			hint:
				"Глоссарий «Контроль модели»: выбранные виды контроля (справочник №3) " +
				"подтягивают работы. Нормативы ч/д — из матрицы №40 по классу модели (задаёт методолог).",
			tasks: CONTROL_TYPICAL_TASKS,
		},
		description: "Контроль моделей: генерация работ по выбранным видам контроля.",
	}),

	rule("default-task-trigger-pilot-required", {
		kind: "task_trigger",
		targetPath: "/mlPlatform/typicalTasks",
		dependencies: ["/generalInfo/pilotNeed"],
		condition: { "==": [{ var: "generalInfo.pilotNeed" }, "Требуется"] },
		payload: {
			taskCode: "PILOT_SUPPORT",
			label: "Сопровождение пилота",
			hint: "Формирует типовую работу «Сопровождение пилота» при pilotNeed = «Требуется».",
		},
		description: "Триггер типовой работы пилота.",
	}),

	// --- Единая итоговая калькуляция (ФТ-026) --------------------------------
	rule("unified-typical-total", {
		kind: "computed",
		targetPath: "/summary/typicalTotal",
		dependencies: [
			"/detailInfo/sourceTypicalTasks",
			"/mlPlatform/typicalTasks",
			"/modelControl/controlTypicalTasks",
		],
		condition: {
			"+": [
				SUM_SOURCE_TYPICAL_TOTAL,
				SUM_TASK_TOTAL,
				SUM_CONTROL_TYPICAL_TOTAL,
			],
		},
		payload: {
			...UNIFIED,
			mode: "expert",
			role: "typical_total",
			label: "Сумма по типовым работам",
			formulaHint:
				"Σ источники + Σ платформа + Σ контроль моделей (sourceTypicalTasks + mlPlatform.typicalTasks + modelControl.controlTypicalTasks).",
		},
		description: "ФТ-026: сумма итоговых оценок типовых работ.",
	}),

	rule("unified-atypical-total", {
		kind: "computed",
		targetPath: "/summary/atypicalTotal",
		dependencies: ["/atypicalTasks", "/mlPlatform/atypicalTasks"],
		condition: {
			"+": [
				sumAtypicalIncluded("atypicalTasks"),
				sumAtypicalIncluded("mlPlatform.atypicalTasks"),
			],
		},
		payload: {
			...UNIFIED,
			mode: "expert",
			role: "atypical_total",
			label: "Сумма по нетиповым работам (включённым)",
			formulaHint:
				"Σ (atypicalTasks + mlPlatform.atypicalTasks) где includeInCalculation = true.",
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
