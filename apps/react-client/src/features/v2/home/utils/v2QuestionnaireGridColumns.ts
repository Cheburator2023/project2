import type { ColDef, ColGroupDef } from "ag-grid-community";
import {
	V2WorkflowGlobalStatusCell,
	v2WorkflowSectionStatusCell,
} from "../molecules/V2WorkflowStatusCell";
import type { V2AnketaMainSectionId } from "@smart-anketa/api-contract";
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

const SECTION_STATUS_COLUMNS: Array<{
	id: V2AnketaMainSectionId;
	headerName: string;
}> = [
	{ id: "generalInfo", headerName: "Общая инф." },
	{ id: "detailInfo", headerName: "Детальная" },
	{ id: "streamDataSources", headerName: "Источники" },
	{ id: "streamMlPlatform", headerName: "Платформа" },
	{ id: "streamModelControl", headerName: "Контроль" },
];

function sectionStatusCol(
	sectionId: V2AnketaMainSectionId,
	headerName: string,
): ColDef<V2QuestionnaireGridRow> {
	return {
		colId: `workflowSection.${sectionId}`,
		headerName,
		width: 120,
		filter: "agSetColumnFilter",
		cellRenderer: v2WorkflowSectionStatusCell(sectionId),
		valueGetter: (p) =>
			resolveVersionRow(p.data)?.workflowSectionStatuses?.[sectionId] ?? null,
	};
}

const E2E_STAGE_FIELDS = [
	{ key: "stageName", headerName: "Этап E2E", width: 200 },
	{ key: "baseScore", headerName: "Базовая", width: 100 },
	{ key: "complexityCoeff", headerName: "С поправкой", width: 110 },
	{ key: "deviationFromBase", headerName: "Отклонение %", width: 110 },
];

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
					colId: "readableId",
					headerName: "Код",
					width: 150,
					// pinned: "left",
					filter: "agTextColumnFilter",
					valueGetter: (p) => resolveVersionRow(p.data)?.readableId ?? "",
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
					headerName: "Статус",
					width: 110,
					filter: "agSetColumnFilter",
					valueGetter: (p) => resolveVersionRow(p.data)?.status ?? "",
				},
				{
					colId: "workflowGlobalStatus",
					headerName: "Заполнение",
					width: 120,
					filter: "agSetColumnFilter",
					cellRenderer: V2WorkflowGlobalStatusCell,
					valueGetter: (p) =>
						resolveVersionRow(p.data)?.workflowGlobalStatus ?? null,
				},
				...SECTION_STATUS_COLUMNS.map(({ id, headerName }) =>
					sectionStatusCol(id, headerName),
				),
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
					headerName: "Создана",
					width: 160,
					filter: "agDateColumnFilter",
					valueFormatter: (p) =>
						p.value ? new Date(String(p.value)).toLocaleString("ru-RU") : "",
					valueGetter: (p) => resolveVersionRow(p.data)?.createdAt ?? "",
				},
			],
		},
		formFieldGroup(
			"Общая информация",
			[
				{ path: "generalInfo.calcName", headerName: "Название", minWidth: 180 },
				{
					path: "generalInfo.businessCustomer",
					headerName: "Бизнес-заказчик",
					width: 150,
				},
				{
					path: "generalInfo.implementationStream",
					headerName: "Стрим/исполнитель",
					width: 150,
				},
				{
					path: "generalInfo.complexity",
					headerName: "Сложность",
					width: 160,
				},
				{ path: "generalInfo.channels", headerName: "Каналы", width: 120 },
				{
					path: "generalInfo.overallUncertainty",
					headerName: "Неопределённость",
					width: 140,
				},
				{ path: "generalInfo.createIS", headerName: "Создание ИС", width: 120 },
				{
					path: "generalInfo.createService",
					headerName: "Создание сервиса",
					width: 140,
				},
				{ path: "generalInfo.pilotNeed", headerName: "Пилот", width: 130 },
			],
			{ openByDefault: true },
		),
		formFieldGroup("Расчёт неопределённости", [
			{
				path: "uncertaintyCalculation.initiativeTimeline",
				headerName: "Сроки инициативы",
				width: 140,
			},
			{
				path: "uncertaintyCalculation.initiativeCost",
				headerName: "Стоимость",
				width: 110,
				filter: "agNumberColumnFilter",
			},
			{
				path: "uncertaintyCalculation.uncertaintyAdjustment",
				headerName: "Поправка",
				width: 100,
				filter: "agNumberColumnFilter",
			},
		]),
		{
			headerName: "Группа рисков",
			marryChildren: true,
			children: [
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
			].map((key) =>
				formFieldCol({
					path: `uncertaintyCalculation.riskGroup.${key}`,
					headerName: key,
					width: 120,
				}),
			),
		},
		formFieldGroup("Параметры / локальные риски", [
			{
				path: "detailInfo.parameters.modelsCount",
				headerName: "Кол-во моделей",
				width: 120,
				filter: "agNumberColumnFilter",
			},
			{
				path: "detailInfo.parameters.algorithmType",
				headerName: "Тип алгоритма",
				width: 140,
			},
			{
				path: "detailInfo.parameters.algorithmCoeff",
				headerName: "Коэф. алгоритма",
				width: 120,
			},
			{
				path: "detailInfo.parameters.autoML",
				headerName: "AutoML",
				width: 110,
			},
			{
				path: "detailInfo.parameters.specialist",
				headerName: "Специалист",
				width: 110,
			},
			{
				path: "detailInfo.parameters.cascadeEnsemble",
				headerName: "Каскад/ансамбль",
				width: 130,
			},
		]),
		{
			headerName: "Системы-источники",
			marryChildren: true,
			children: [0, 1, 2].map((index) =>
				arrayItemGroup(
					"Источник",
					"streamDataSources.sourceSystems",
					index,
					SOURCE_SYSTEM_FIELDS,
				),
			),
		},
		formFieldGroup("Типовые работы (источники)", [
			{
				path: "streamDataSources.sourceTypicalTasks[0].name",
				headerName: "Задача 1",
				width: 180,
			},
			{
				path: "streamDataSources.sourceTypicalTasks[0].total",
				headerName: "Итог 1",
				width: 90,
				filter: "agNumberColumnFilter",
			},
			{
				path: "streamDataSources.sourceTypicalTasks[1].name",
				headerName: "Задача 2",
				width: 180,
			},
			{
				path: "streamDataSources.sourceTypicalTasks[1].total",
				headerName: "Итог 2",
				width: 90,
				filter: "agNumberColumnFilter",
			},
		]),
		{
			headerName: "Витрины обучения",
			marryChildren: true,
			children: [0, 1].map((index) =>
				arrayItemGroup(
					"Витрина",
					"streamModelControl.dataObjects.trainingSources",
					index,
					TRAINING_SOURCE_FIELDS,
				),
			),
		},
		{
			headerName: "Витрины применения",
			marryChildren: true,
			children: [0].map((index) =>
				arrayItemGroup(
					"Витрина",
					"streamModelControl.dataObjects.applicationSources",
					index,
					[
						{ key: "name", headerName: "Название", width: 150 },
						{ key: "mode", headerName: "Режим", width: 110 },
						{ key: "updateFrequency", headerName: "Обновление", width: 120 },
						{ key: "development", headerName: "Доработка", width: 120 },
						{ key: "controlKD", headerName: "Контрольный КД", width: 120 },
						{ key: "usedModels", headerName: "Модели", width: 120 },
					],
				),
			),
		},
		formFieldGroup("Процессы обработки данных", [
			{
				path: "dataProcessing.sourcesRDS",
				headerName: "Источников RDS",
				width: 120,
				filter: "agNumberColumnFilter",
			},
			{
				path: "dataProcessing.consumers",
				headerName: "Приёмников",
				width: 110,
				filter: "agNumberColumnFilter",
			},
			{
				path: "dataProcessing.otherMicroservices",
				headerName: "Микросервисов",
				width: 120,
				filter: "agNumberColumnFilter",
			},
			{
				path: "dataProcessing.filters",
				headerName: "Фильтров",
				width: 100,
				filter: "agNumberColumnFilter",
			},
			{
				path: "dataProcessing.yaspArtifact",
				headerName: "ЯСП",
				width: 80,
			},
		]),
		formFieldGroup("Модели", [
			{
				path: "models.cascadeEnsemble",
				headerName: "Каскад/ансамбль",
				width: 130,
			},
			{
				path: "models.recalibrationType",
				headerName: "Рекалибровка",
				width: 150,
			},
		]),
		{
			headerName: "Список моделей",
			marryChildren: true,
			children: [0, 1].map((index) =>
				arrayItemGroup(
					"Модель",
					"streamModelControl.models.modelsList",
					index,
					MODEL_FIELDS,
				),
			),
		},
		formFieldGroup("Итоговая оценка", [
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
			openByDefault: true,
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
