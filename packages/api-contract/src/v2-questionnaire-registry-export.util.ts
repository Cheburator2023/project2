import type { V2QuestionnaireDto } from "./v2-questionnaire.types";
import type { V2AnketaMainSectionId } from "./v2-anketa-workflow.types";
import { V2_ANKETA_MAIN_SECTION_TITLES } from "./v2-anketa-workflow.util";

export type V2RegistryExportColumn = {
	key: string;
	header: string;
	valueGetter: (row: V2QuestionnaireDto) => unknown;
};

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

function getByPath(obj: unknown, path: string): unknown {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		const match = /^(\w+)\[(\d+)\]$/.exec(part);
		if (match) {
			const [, key, indexStr] = match;
			const container = (current as Record<string, unknown>)[key!];
			if (!Array.isArray(container)) return undefined;
			current = container[Number.parseInt(indexStr!, 10)];
		} else {
			current = (current as Record<string, unknown>)[part];
		}
	}
	return current;
}

export function formatV2RegistryExportCellValue(value: unknown): string {
	if (value == null || value === "") return "";
	if (typeof value === "boolean") return value ? "Да" : "Нет";
	if (typeof value === "number") return String(value);
	if (Array.isArray(value)) {
		return value
			.map((item) =>
				typeof item === "object" && item != null
					? JSON.stringify(item)
					: String(item),
			)
			.join("; ");
	}
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

function formPath(row: V2QuestionnaireDto, path: string): unknown {
	return getByPath(row.formData ?? {}, path);
}

function sectionStatusCol(sectionId: V2AnketaMainSectionId): V2RegistryExportColumn {
	return {
		key: `workflowSection.${sectionId}`,
		header: `${V2_ANKETA_MAIN_SECTION_TITLES[sectionId]} — статус`,
		valueGetter: (row) => row.workflowSectionStatuses?.[sectionId] ?? "",
	};
}

function formCol(path: string, header: string): V2RegistryExportColumn {
	return {
		key: `form.${path}`,
		header,
		valueGetter: (row) => formPath(row, path),
	};
}

const SOURCE_SYSTEM_FIELDS = [
	["name", "Название"],
	["type", "Тип"],
	["daptRegistry", "Реестр ДАПТ"],
	["requirements", "Требования"],
	["additionalUncertainty", "Доп. неопр."],
	["integrationReadiness", "Готовность ПД"],
	["dataCoeff", "Коэф. данных"],
	["nda", "НДА"],
] as const;

const TRAINING_SOURCE_FIELDS = [
	["name", "Название"],
	["frequency", "Признаков"],
	["development", "Доработка"],
	["integration", "Интеграция"],
	["dataCondition", "Условие данных"],
	["usedModels", "Модели"],
	["controlKD", "Контрольный КД"],
] as const;

const MODEL_FIELDS = [
	["name", "Название"],
	["class", "Класс"],
	["taskType", "Тип задачи"],
	["algorithm", "Алгоритм"],
	["autoML", "AutoML"],
	["role", "Роль"],
] as const;

const PLATFORM_STREAM_FIELDS = [
	["streamName", "Стрим"],
	["baseTypicalScore", "Базовая (типовые)"],
	["adjustedTypicalScore", "С поправкой"],
	["deviationPercent", "Отклонение %"],
	["atypicalScore", "Нетиповые"],
] as const;

const E2E_STAGE_FIELDS = [
	["stageName", "Этап E2E"],
	["baseScore", "Базовая"],
	["complexityCoeff", "С поправкой"],
	["deviationFromBase", "Отклонение %"],
] as const;

function arrayItemCols(
	groupHeader: string,
	basePath: string,
	index: number,
	fields: ReadonlyArray<readonly [string, string]>,
): V2RegistryExportColumn[] {
	return fields.map(([key, label]) =>
		formCol(`${basePath}[${index}].${key}`, `${groupHeader} ${index + 1} — ${label}`),
	);
}

/** Плоский список колонок реестра v2 (совпадает с AG Grid). */
export function buildV2QuestionnaireRegistryExportColumns(): V2RegistryExportColumn[] {
	return [
		{ key: "calcName", header: "Анкета", valueGetter: (r) => r.calcName },
		{
			key: "readableId",
			header: "ID анкеты",
			valueGetter: (r) => r.readableId ?? r.id,
		},
		{ key: "version", header: "Версия", valueGetter: (r) => r.version },
		{ key: "status", header: "Статус записи", valueGetter: (r) => r.status },
		{
			key: "workflowGlobalStatus",
			header: "Статус анкеты",
			valueGetter: (r) => r.workflowGlobalStatus ?? "",
		},
		{ key: "author", header: "Автор", valueGetter: (r) => r.author ?? "" },
		{
			key: "templateName",
			header: "Шаблон",
			valueGetter: (r) => r.templateName ?? "",
		},
		{
			key: "schemaBindingStatus",
			header: "Привязка схемы",
			valueGetter: (r) => r.schemaBinding.status,
		},
		{
			key: "finalCoefficient",
			header: "Итоговый коэф.",
			valueGetter: (r) => r.finalCoefficient,
		},
		{
			key: "createdAt",
			header: "Дата создания",
			valueGetter: (r) => r.createdAt,
		},
		{
			key: "updatedAt",
			header: "Дата последнего изменения",
			valueGetter: (r) => r.updatedAt,
		},
		sectionStatusCol("generalInfo"),
		formCol("generalInfo.calcName", "Название анкеты (инициативы)"),
		formCol("generalInfo.businessCustomer", "Заказчик"),
		formCol("generalInfo.implementationStream", "Стрим-исполнитель"),
		formCol("generalInfo.complexity", "Сложность"),
		formCol("generalInfo.channels", "Каналы"),
		formCol("generalInfo.overallUncertainty", "Неопределённость"),
		formCol("generalInfo.createIS", "Создание ИС"),
		formCol("generalInfo.createService", "Создание сервиса"),
		formCol("generalInfo.pilotNeed", "Пилот"),
		formCol("uncertaintyCalculation.initiativeTimeline", "Сроки инициативы"),
		formCol("uncertaintyCalculation.initiativeCost", "Стоимость инициативы"),
		formCol(
			"uncertaintyCalculation.uncertaintyAdjustment",
			"Поправка неопределённости",
		),
		...RISK_GROUP_KEYS.map((key) =>
			formCol(`uncertaintyCalculation.riskGroup.${key}`, key),
		),
		sectionStatusCol("detailInfo"),
		formCol("detailInfo.parameters.streamsOutsideDADM", "Стримы вне ДАДМ"),
		formCol("detailInfo.parameters.streamNames", "Названия стримов"),
		formCol("detailInfo.model.modelsCount", "Кол-во моделей"),
		formCol("detailInfo.model.algorithmType", "Тип алгоритма"),
		formCol("detailInfo.model.algorithmCoeff", "Коэф. алгоритма"),
		formCol("detailInfo.model.autoML", "AutoML"),
		formCol("detailInfo.model.specialist", "Специалист"),
		formCol("detailInfo.model.cascadeEnsemble", "Каскад/ансамбль"),
		sectionStatusCol("streamDataSources"),
		...([0, 1, 2] as const).flatMap((index) =>
			arrayItemCols(
				"Источник",
				"detailInfo.sourceSystems",
				index,
				SOURCE_SYSTEM_FIELDS,
			),
		),
		formCol("streamDataSources.sourceTypicalTasks[0].name", "Типовая задача 1"),
		formCol("streamDataSources.sourceTypicalTasks[0].total", "Итог задачи 1"),
		formCol("streamDataSources.sourceTypicalTasks[1].name", "Типовая задача 2"),
		formCol("streamDataSources.sourceTypicalTasks[1].total", "Итог задачи 2"),
		formCol("streamDataSources.atypicalTasks[0].name", "Нетиповая задача 1"),
		formCol("streamDataSources.atypicalTasks[0].total", "Итог нетиповой 1"),
		sectionStatusCol("streamModelControl"),
		formCol("streamModelControl.dataProcessing.sourcesRDS", "Источников RDS"),
		formCol("streamModelControl.dataProcessing.consumers", "Приёмников"),
		formCol(
			"streamModelControl.dataProcessing.otherMicroservices",
			"Микросервисов",
		),
		formCol("streamModelControl.dataProcessing.filters", "Фильтров"),
		formCol("streamModelControl.dataProcessing.yaspArtifact", "ЯСП"),
		...([0, 1] as const).flatMap((index) =>
			arrayItemCols(
				"Витрина обучения",
				"streamModelControl.dataObjects.trainingSources",
				index,
				TRAINING_SOURCE_FIELDS,
			),
		),
		...arrayItemCols(
			"Витрина применения",
			"streamModelControl.dataObjects.applicationSources",
			0,
			[
				["name", "Название"],
				["mode", "Режим"],
				["updateFrequency", "Обновление"],
				["development", "Доработка"],
				["controlKD", "Контрольный КД"],
				["usedModels", "Модели"],
			],
		),
		formCol("streamModelControl.models.cascadeEnsemble", "Каскад/ансамбль"),
		formCol("streamModelControl.models.recalibrationType", "Рекалибровка"),
		...([0, 1] as const).flatMap((index) =>
			arrayItemCols(
				"Модель",
				"streamModelControl.models.modelsList",
				index,
				MODEL_FIELDS,
			),
		),
		formCol("summary.total", "Общая стоимость"),
		formCol("summary.baseScoreStream", "Базовая (СФЕРА)"),
		formCol("summary.scoreWithComplexityCoeff", "С поправкой сложности"),
		formCol("summary.deviationFromBaseline", "Отклонение %"),
		...([0, 1, 2, 3] as const).flatMap((index) =>
			arrayItemCols(
				"Стрим",
				"summary.platformStreams",
				index,
				PLATFORM_STREAM_FIELDS,
			),
		),
		...([0, 1, 2, 3, 4] as const).flatMap((index) =>
			arrayItemCols(
				"Этап",
				"summary.detailedCalculation",
				index,
				E2E_STAGE_FIELDS,
			),
		),
	];
}

export function buildV2QuestionnaireRegistryExportRow(
	row: V2QuestionnaireDto,
	columns: V2RegistryExportColumn[] = buildV2QuestionnaireRegistryExportColumns(),
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const col of columns) {
		const raw = col.valueGetter(row);
		if (col.key === "createdAt" || col.key === "updatedAt") {
			out[col.key] = raw ? new Date(String(raw)).toLocaleString("ru-RU") : "";
			continue;
		}
		out[col.key] = formatV2RegistryExportCellValue(raw);
	}
	return out;
}
