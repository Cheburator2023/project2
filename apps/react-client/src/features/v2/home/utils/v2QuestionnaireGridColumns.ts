import type { ColDef, ColGroupDef } from "ag-grid-community";
import {
	V2WorkflowGlobalStatusCell,
	v2WorkflowSectionStatusCell,
} from "../molecules/V2WorkflowStatusCell";
import {
	V2_ANKETA_MAIN_SECTION_TITLES,
	type V2AnketaMainSectionId,
} from "@smart-anketa/api-contract";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import {
	formatGridCellValue,
	formPathColId,
	getFormValue,
	resolveVersionRow,
} from "./v2QuestionnaireGridValue";

type FieldSpec = {
	path: string;
	headerName: string;
	width?: number;
	minWidth?: number;
	filter?: ColDef["filter"];
};

function formFieldCol({
	path,
	headerName,
	width,
	minWidth,
	filter = "agTextColumnFilter",
}: FieldSpec): ColDef<V2QuestionnaireGridRow> {
	return {
		colId: formPathColId(path),
		headerName,
		width,
		minWidth,
		filter,
		valueGetter: (p) => formatGridCellValue(getFormValue(p.data, path)),
	};
}

function formFieldGroup(
	headerName: string,
	fields: FieldSpec[],
	opts?: { openByDefault?: boolean },
): ColGroupDef<V2QuestionnaireGridRow> {
	return {
		headerName,
		marryChildren: true,
		openByDefault: opts?.openByDefault,
		children: fields.map(formFieldCol),
	};
}

function arrayItemGroup(
	groupHeader: string,
	basePath: string,
	index: number,
	fields: Array<{ key: string; headerName: string; width?: number }>,
): ColGroupDef<V2QuestionnaireGridRow> {
	const prefix = `${basePath}[${index}]`;
	return {
		headerName: `${groupHeader} ${index + 1}`,
		marryChildren: true,
		children: fields.map((f) =>
			formFieldCol({
				path: `${prefix}.${f.key}`,
				headerName: f.headerName,
				width: f.width,
			}),
		),
	};
}

function sectionStatusCol(
	sectionId: V2AnketaMainSectionId,
): ColDef<V2QuestionnaireGridRow> {
	return {
		colId: `workflowSection.${sectionId}`,
		headerName: "Статус раздела",
		width: 130,
		pinned: undefined,
		filter: "agSetColumnFilter",
		cellRenderer: v2WorkflowSectionStatusCell(sectionId),
		valueGetter: (p) =>
			resolveVersionRow(p.data)?.workflowSectionStatuses?.[sectionId] ?? null,
	};
}

function mainSectionGroup(
	sectionId: V2AnketaMainSectionId,
	children: Array<
		ColDef<V2QuestionnaireGridRow> | ColGroupDef<V2QuestionnaireGridRow>
	>,
	opts?: { openByDefault?: boolean },
): ColGroupDef<V2QuestionnaireGridRow> {
	return {
		headerName: V2_ANKETA_MAIN_SECTION_TITLES[sectionId],
		marryChildren: true,
		openByDefault: opts?.openByDefault,
		children: [sectionStatusCol(sectionId), ...children],
	};
}

const SOURCE_SYSTEM_FIELDS = [
	{ key: "name", headerName: "Название", width: 160 },
	{ key: "type", headerName: "Тип", width: 110 },
	{ key: "daptRegistry", headerName: "Реестр ДАПТ", width: 120 },
	{ key: "requirements", headerName: "Требования", width: 130 },
	{ key: "additionalUncertainty", headerName: "Доп. неопр.", width: 110 },
	{ key: "integrationReadiness", headerName: "Готовность ПД", width: 150 },
	{ key: "dataCoeff", headerName: "Коэф. данных", width: 110 },
	{ key: "nda", headerName: "НДА", width: 80 },
];

const TRAINING_SOURCE_FIELDS = [
	{ key: "name", headerName: "Название", width: 150 },
	{ key: "frequency", headerName: "Признаков", width: 100 },
	{ key: "development", headerName: "Доработка", width: 120 },
	{ key: "integration", headerName: "Интеграция", width: 120 },
	{ key: "dataCondition", headerName: "Условие данных", width: 130 },
	{ key: "usedModels", headerName: "Модели", width: 120 },
	{ key: "controlKD", headerName: "Контрольный КД", width: 120 },
];

const MODEL_FIELDS = [
	{ key: "name", headerName: "Название", width: 150 },
	{ key: "class", headerName: "Класс", width: 140 },
	{ key: "taskType", headerName: "Тип задачи", width: 160 },
	{ key: "algorithm", headerName: "Алгоритм", width: 130 },
	{ key: "autoML", headerName: "AutoML", width: 90 },
	{ key: "role", headerName: "Роль", width: 120 },
];

const PLATFORM_STREAM_FIELDS = [
	{ key: "streamName", headerName: "Стрим", width: 180 },
	{ key: "baseTypicalScore", headerName: "Базовая (типовые)", width: 130 },
	{ key: "adjustedTypicalScore", headerName: "С поправкой", width: 120 },
	{ key: "deviationPercent", headerName: "Отклонение %", width: 110 },
	{ key: "atypicalScore", headerName: "Нетиповые", width: 110 },
];

const E2E_STAGE_FIELDS = [
	{ key: "stageName", headerName: "Этап E2E", width: 200 },
	{ key: "baseScore", headerName: "Базовая", width: 100 },
	{ key: "complexityCoeff", headerName: "С поправкой", width: 110 },
	{ key: "deviationFromBase", headerName: "Отклонение %", width: 110 },
];

const RISK_GROUP_KEYS = [
	"businessComplexity",
	"defectsInSolution",
	"adjacentProjectsImpact",
	"laborCostIncrease",
	"thirdPartyNegligence",
	"staffShortage",
	"sanctions",
	"controlProceduresLack",
	"regulatoryChanges",
	"isNotUsedAfterProject",
	"itArchitectureChanges",
] as const;

export function buildV2QuestionnaireColumnDefs(): (
	| ColDef<V2QuestionnaireGridRow>
	| ColGroupDef<V2QuestionnaireGridRow>
)[] {
	return [
		{
			headerName: "Реестр",
			marryChildren: true,
			openByDefault: true,
			children: [
				{
					colId: "calcName",
					headerName: "Анкета",
					width: 260,
					filter: "agTextColumnFilter",
					valueGetter: (p) => resolveVersionRow(p.data)?.calcName ?? "",
				},
				{
					colId: "readableId",
					headerName: "ID анкеты",
					width: 150,
					filter: "agTextColumnFilter",
					valueGetter: (p) => {
						const row = resolveVersionRow(p.data);
						return row?.readableId ?? row?.id ?? "";
					},
				},
				{
					colId: "version",
					headerName: "Версия",
					width: 90,
					filter: "agTextColumnFilter",
					valueGetter: (p) => resolveVersionRow(p.data)?.version ?? "",
				},
				{
					colId: "status",
					headerName: "Статус записи",
					width: 110,
					filter: "agSetColumnFilter",
					valueGetter: (p) => resolveVersionRow(p.data)?.status ?? "",
				},
				{
					colId: "workflowGlobalStatus",
					headerName: "Статус анкеты",
					width: 130,
					filter: "agSetColumnFilter",
					cellRenderer: V2WorkflowGlobalStatusCell,
					valueGetter: (p) =>
						resolveVersionRow(p.data)?.workflowGlobalStatus ?? null,
				},
				{
					colId: "author",
					headerName: "Автор",
					width: 130,
					filter: "agTextColumnFilter",
					valueGetter: (p) => resolveVersionRow(p.data)?.author ?? "",
				},
				{
					colId: "templateName",
					headerName: "Шаблон",
					width: 140,
					filter: "agTextColumnFilter",
					valueGetter: (p) => resolveVersionRow(p.data)?.templateName ?? "",
				},
				{
					colId: "schemaBindingStatus",
					headerName: "Привязка схемы",
					width: 140,
					filter: "agSetColumnFilter",
					valueGetter: (p) =>
						resolveVersionRow(p.data)?.schemaBinding.status ?? "",
				},
				{
					colId: "finalCoefficient",
					headerName: "Итоговый коэф.",
					width: 120,
					filter: "agNumberColumnFilter",
					valueGetter: (p) =>
						resolveVersionRow(p.data)?.finalCoefficient ?? null,
				},
				{
					colId: "createdAt",
					headerName: "Дата создания",
					width: 160,
					filter: "agDateColumnFilter",
					valueFormatter: (p) =>
						p.value ? new Date(String(p.value)).toLocaleString("ru-RU") : "",
					valueGetter: (p) => resolveVersionRow(p.data)?.createdAt ?? "",
				},
				{
					colId: "updatedAt",
					headerName: "Дата последнего изменения",
					width: 180,
					filter: "agDateColumnFilter",
					valueFormatter: (p) =>
						p.value ? new Date(String(p.value)).toLocaleString("ru-RU") : "",
					valueGetter: (p) => resolveVersionRow(p.data)?.updatedAt ?? "",
				},
			],
		},
		mainSectionGroup(
			"generalInfo",
			[
				formFieldCol({
					path: "generalInfo.calcName",
					headerName: "Название анкеты (инициативы)",
					minWidth: 220,
				}),
				formFieldCol({
					path: "generalInfo.businessCustomer",
					headerName: "Заказчик",
					width: 150,
				}),
				formFieldCol({
					path: "generalInfo.implementationStream",
					headerName: "Стрим-исполнитель",
					width: 160,
				}),
				formFieldCol({
					path: "generalInfo.complexity",
					headerName: "Сложность",
					width: 160,
				}),
				formFieldCol({
					path: "generalInfo.channels",
					headerName: "Каналы",
					width: 120,
				}),
				formFieldCol({
					path: "generalInfo.overallUncertainty",
					headerName: "Неопределённость",
					width: 140,
				}),
				formFieldCol({
					path: "generalInfo.createIS",
					headerName: "Создание ИС",
					width: 120,
				}),
				formFieldCol({
					path: "generalInfo.createService",
					headerName: "Создание сервиса",
					width: 140,
				}),
				formFieldCol({
					path: "generalInfo.pilotNeed",
					headerName: "Пилот",
					width: 130,
				}),
				formFieldCol({
					path: "uncertaintyCalculation.initiativeTimeline",
					headerName: "Сроки инициативы",
					width: 140,
				}),
				formFieldCol({
					path: "uncertaintyCalculation.initiativeCost",
					headerName: "Стоимость инициативы",
					width: 130,
					filter: "agNumberColumnFilter",
				}),
				formFieldCol({
					path: "uncertaintyCalculation.uncertaintyAdjustment",
					headerName: "Поправка неопределённости",
					width: 150,
					filter: "agNumberColumnFilter",
				}),
				...RISK_GROUP_KEYS.map((key) =>
					formFieldCol({
						path: `uncertaintyCalculation.riskGroup.${key}`,
						headerName: key,
						width: 120,
					}),
				),
			],
			{ openByDefault: true },
		),
		mainSectionGroup("detailInfo", [
			formFieldCol({
				path: "detailInfo.model.modelsCount",
				headerName: "Кол-во моделей",
				width: 120,
				filter: "agNumberColumnFilter",
			}),
			formFieldCol({
				path: "detailInfo.model.algorithmType",
				headerName: "Тип алгоритма",
				width: 140,
			}),
			formFieldCol({
				path: "detailInfo.model.algorithmCoeff",
				headerName: "Коэф. алгоритма",
				width: 120,
			}),
			formFieldCol({
				path: "detailInfo.model.autoML",
				headerName: "AutoML",
				width: 110,
			}),
			formFieldCol({
				path: "detailInfo.model.specialist",
				headerName: "Специалист",
				width: 110,
			}),
			formFieldCol({
				path: "detailInfo.model.cascadeEnsemble",
				headerName: "Каскад/ансамбль",
				width: 130,
			}),
		]),
		mainSectionGroup("streamDataSources", [
			...([0, 1, 2] as const).map((index) =>
				arrayItemGroup(
					"Источник",
					"detailInfo.sourceSystems",
					index,
					SOURCE_SYSTEM_FIELDS,
				),
			),
			formFieldCol({
				path: "streamDataSources.sourceTypicalTasks[0].name",
				headerName: "Типовая задача 1",
				width: 180,
			}),
			formFieldCol({
				path: "streamDataSources.sourceTypicalTasks[0].total",
				headerName: "Итог задачи 1",
				width: 110,
				filter: "agNumberColumnFilter",
			}),
			formFieldCol({
				path: "streamDataSources.sourceTypicalTasks[1].name",
				headerName: "Типовая задача 2",
				width: 180,
			}),
			formFieldCol({
				path: "streamDataSources.sourceTypicalTasks[1].total",
				headerName: "Итог задачи 2",
				width: 110,
				filter: "agNumberColumnFilter",
			}),
			formFieldCol({
				path: "streamDataSources.atypicalTasks[0].name",
				headerName: "Нетиповая задача 1",
				width: 180,
			}),
			formFieldCol({
				path: "streamDataSources.atypicalTasks[0].total",
				headerName: "Итог нетиповой 1",
				width: 120,
				filter: "agNumberColumnFilter",
			}),
		]),
		mainSectionGroup("streamModelControl", [
			formFieldCol({
				path: "streamModelControl.dataProcessing.sourcesRDS",
				headerName: "Источников RDS",
				width: 120,
				filter: "agNumberColumnFilter",
			}),
			formFieldCol({
				path: "streamModelControl.dataProcessing.consumers",
				headerName: "Приёмников",
				width: 110,
				filter: "agNumberColumnFilter",
			}),
			formFieldCol({
				path: "streamModelControl.dataProcessing.otherMicroservices",
				headerName: "Микросервисов",
				width: 120,
				filter: "agNumberColumnFilter",
			}),
			formFieldCol({
				path: "streamModelControl.dataProcessing.filters",
				headerName: "Фильтров",
				width: 100,
				filter: "agNumberColumnFilter",
			}),
			formFieldCol({
				path: "streamModelControl.dataProcessing.yaspArtifact",
				headerName: "ЯСП",
				width: 80,
			}),
			...([0, 1] as const).map((index) =>
				arrayItemGroup(
					"Витрина обучения",
					"streamModelControl.dataObjects.trainingSources",
					index,
					TRAINING_SOURCE_FIELDS,
				),
			),
			arrayItemGroup(
				"Витрина применения",
				"streamModelControl.dataObjects.applicationSources",
				0,
				[
					{ key: "name", headerName: "Название", width: 150 },
					{ key: "mode", headerName: "Режим", width: 110 },
					{ key: "updateFrequency", headerName: "Обновление", width: 120 },
					{ key: "development", headerName: "Доработка", width: 120 },
					{ key: "controlKD", headerName: "Контрольный КД", width: 120 },
					{ key: "usedModels", headerName: "Модели", width: 120 },
				],
			),
			formFieldCol({
				path: "streamModelControl.models.cascadeEnsemble",
				headerName: "Каскад/ансамбль",
				width: 130,
			}),
			formFieldCol({
				path: "streamModelControl.models.recalibrationType",
				headerName: "Рекалибровка",
				width: 150,
			}),
			...([0, 1] as const).map((index) =>
				arrayItemGroup(
					"Модель",
					"streamModelControl.models.modelsList",
					index,
					MODEL_FIELDS,
				),
			),
		]),
		formFieldGroup("Итоговая оценка", [
			{
				path: "summary.total",
				headerName: "Общая стоимость",
				width: 130,
				filter: "agNumberColumnFilter",
			},
			{
				path: "summary.baseScoreStream",
				headerName: "Базовая (СФЕРА)",
				width: 130,
				filter: "agNumberColumnFilter",
			},
			{
				path: "summary.scoreWithComplexityCoeff",
				headerName: "С поправкой сложности",
				width: 150,
				filter: "agNumberColumnFilter",
			},
			{
				path: "summary.deviationFromBaseline",
				headerName: "Отклонение %",
				width: 120,
				filter: "agNumberColumnFilter",
			},
		]),
		{
			headerName: "Платформенные стримы",
			marryChildren: true,
			children: [0, 1, 2, 3].map((index) =>
				arrayItemGroup(
					"Стрим",
					"summary.platformStreams",
					index,
					PLATFORM_STREAM_FIELDS,
				),
			),
		},
		{
			headerName: "E2E этапы",
			marryChildren: true,
			children: [0, 1, 2, 3, 4].map((index) =>
				arrayItemGroup(
					"Этап",
					"summary.detailedCalculation",
					index,
					E2E_STAGE_FIELDS,
				),
			),
		},
	];
}
