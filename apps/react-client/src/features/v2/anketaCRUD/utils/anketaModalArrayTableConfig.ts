import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { AnketaCompactArrayTablePath } from "./anketaFormModalPaths";
import { getArrayItemSchemaSliceForModal } from "./anketaSchemaAtPath";
import { readAnketaFormContext } from "./anketaFormContext";
import {
	collectGeneratedTypicalWorkArrayPaths,
	dedupeTypicalWorkRowsByWorkId,
	listAllGeneratedTypicalWorkArrayPaths,
	resolveTypicalWorkCatalogStreamLabel,
	resolveV2AnketaArchComponent,
	sortModelStreamTypicalWorkRows,
	V2_MODEL_STREAM_EXECUTOR,
} from "@smart-anketa/api-contract";

export type AnketaArrayTableColumn = {
	key: string;
	header: string;
	width?: string;
	render?: (item: Record<string, unknown>) => string;
	field?: string;
	chip?: boolean;
	link?: boolean;
	multiline?: boolean;
};

function text(item: Record<string, unknown>, field: string): string {
	const value = item[field];
	if (value == null || value === "") return "—";
	return String(value);
}

function workTypeFromIntegration(item: Record<string, unknown>): string {
	const value = String(item.integrationReadiness ?? "");
	if (value.includes("доработки")) return "Разработка";
	if (value) return "Сопровождение";
	return "—";
}

function configFromRequirements(item: Record<string, unknown>): string {
	const value = String(item.requirements ?? "");
	if (value === "Рисковые") return "Требуется";
	if (value === "Понятны") return "Не требуется";
	return value || "—";
}

function formatNameLabel(raw: string): string {
	if (raw === "crm_retail") return "CRM Retail";
	if (raw === "crm_corp") return "CRM Corp";
	return raw;
}

export function formatTypicalWorkNumberValue(value: unknown): string {
	if (value == null || value === "") return "—";
	if (typeof value === "number" && Number.isFinite(value)) {
		if (Number.isInteger(value)) return String(value);
		return String(Math.round(value * 10000) / 10000)
			.replace(/(\.\d*?)0+$/, "$1")
			.replace(/\.$/, "");
	}
	return String(value);
}

function formatTypicalWorkNumber(
	item: Record<string, unknown>,
	field: string,
): string {
	return formatTypicalWorkNumberValue(item[field]);
}

/** Числовое значение итога строки (с нормализацией float-артефактов). */
export function normalizeTypicalWorkTotalValue(raw: unknown): number | null {
	if (raw == null || raw === "") return null;
	const num =
		typeof raw === "number"
			? raw
			: typeof raw === "string" && raw.trim()
				? Number(raw.replace(",", "."))
				: Number.NaN;
	if (!Number.isFinite(num)) return null;
	const normalized =
		Number.isInteger(num) ? num : Math.round(num * 10000) / 10000;
	return Math.max(0, normalized);
}

const FACTORY_TYPICAL_WORK_COLUMNS: AnketaArrayTableColumn[] = [
	{
		key: "name",
		header: "Название типовой работы",
		width: "2fr",
		multiline: true,
		render: (item) => text(item, "name"),
	},
	{
		key: "estimate",
		header: "Базовая оценка",
		width: "0.85fr",
		render: (item) => formatTypicalWorkNumber(item, "estimateHoursPerDay"),
	},
	{
		key: "coefficient",
		header: "Коэффициент",
		width: "0.85fr",
		render: (item) => formatTypicalWorkNumber(item, "coefficient"),
	},
	{
		key: "total",
		header: "Итог",
		width: "0.85fr",
		render: (item) => formatTypicalWorkNumber(item, "total"),
	},
];

const TYPICAL_WORK_COLUMNS: AnketaArrayTableColumn[] =
	FACTORY_TYPICAL_WORK_COLUMNS;

const ATYPICAL_WORK_COLUMNS: AnketaArrayTableColumn[] = [
	{
		key: "name",
		header: "Название",
		width: "1.5fr",
		link: true,
		render: (item) => text(item, "name"),
	},
	{
		key: "workType",
		header: "Тип работ",
		width: "1.2fr",
		render: (item) => text(item, "workType"),
	},
	{
		key: "estimate",
		header: "Базовая оценка (ч/д)",
		width: "0.95fr",
		render: (item) => text(item, "estimateHoursPerDay"),
	},
	{
		key: "coefficient",
		header: "Коэф.",
		width: "0.7fr",
		render: (item) => text(item, "coefficient"),
	},
	{
		key: "total",
		header: "Итог",
		width: "0.7fr",
		render: (item) => text(item, "total"),
	},
];

export const ANKETA_ARRAY_TABLE_COLUMNS: Record<
	AnketaCompactArrayTablePath,
	AnketaArrayTableColumn[]
> = {
	"detailInfo.sourceSystems": [
		{
			key: "name",
			header: "Название источника",
			width: "1.4fr",
			link: true,
			render: (item) => formatNameLabel(text(item, "name")),
		},
		{
			key: "type",
			header: "Тип источника",
			width: "1fr",
			render: (item) => text(item, "type"),
		},
		{
			key: "domainComplexity",
			header: "Сложность ПО",
			width: "1fr",
			render: (item) => text(item, "domainComplexity"),
		},
		{
			key: "entityVolume",
			header: "Объём по сущностям",
			width: "1fr",
			render: (item) => text(item, "entityVolume"),
		},
		{
			key: "workType",
			header: "Тип работ",
			width: "1fr",
			render: workTypeFromIntegration,
		},
		{
			key: "pilot",
			header: "Требуется пилот",
			width: "0.9fr",
			render: (item) => text(item, "additionalUncertainty"),
		},
		{
			key: "config",
			header: "Обмен конф. данными",
			width: "1.1fr",
			render: configFromRequirements,
		},
		{
			key: "sourceFor",
			header: "Источник для",
			width: "1.2fr",
			chip: true,
			render: (item) => {
				const manual = item.manualParameters;
				if (Array.isArray(manual) && manual.length > 0) {
					return String(manual[0]);
				}
				return text(item, "daptRegistry");
			},
		},
	],
	"streamDataSources.sourceSystems": [
		{
			key: "name",
			header: "Название источника",
			width: "1.4fr",
			link: true,
			render: (item) => formatNameLabel(text(item, "name")),
		},
		{
			key: "type",
			header: "Тип источника",
			width: "1fr",
			render: (item) => text(item, "type"),
		},
		{
			key: "domainComplexity",
			header: "Сложность ПО",
			width: "1fr",
			render: (item) => text(item, "domainComplexity"),
		},
		{
			key: "entityVolume",
			header: "Объём по сущностям",
			width: "1fr",
			render: (item) => text(item, "entityVolume"),
		},
		{
			key: "workType",
			header: "Тип работ",
			width: "1fr",
			render: workTypeFromIntegration,
		},
		{
			key: "pilot",
			header: "Требуется пилот",
			width: "0.9fr",
			render: (item) => text(item, "additionalUncertainty"),
		},
		{
			key: "config",
			header: "Обмен конф. данными",
			width: "1.1fr",
			render: configFromRequirements,
		},
		{
			key: "sourceFor",
			header: "Источник для",
			width: "1.2fr",
			chip: true,
			render: (item) => {
				const manual = item.manualParameters;
				if (Array.isArray(manual) && manual.length > 0) {
					return String(manual[0]);
				}
				return text(item, "daptRegistry");
			},
		},
	],
	"streamModelControl.dataObjects.trainingSources": [
		{
			key: "name",
			header: "Название витрины",
			width: "1.5fr",
			link: true,
			render: (item) => text(item, "name"),
		},
		{
			key: "development",
			header: "Доработка",
			width: "1fr",
			render: (item) => text(item, "development"),
		},
		{
			key: "integration",
			header: "Интеграция",
			width: "1fr",
			render: (item) => text(item, "integration"),
		},
		{
			key: "usedModels",
			header: "Модели",
			width: "1fr",
			render: (item) => text(item, "usedModels"),
		},
	],
	"streamModelControl.dataObjects.applicationSources": [
		{
			key: "name",
			header: "Название витрины",
			width: "1.5fr",
			link: true,
			render: (item) => text(item, "name"),
		},
		{
			key: "mode",
			header: "Режим",
			width: "1fr",
			render: (item) => text(item, "mode"),
		},
		{
			key: "development",
			header: "Доработка",
			width: "1fr",
			render: (item) => text(item, "development"),
		},
		{
			key: "usedModels",
			header: "Модели",
			width: "1fr",
			render: (item) => text(item, "usedModels"),
		},
	],
	"detailInfo.model.modelsList": [
		{
			key: "name",
			header: "Название модели",
			width: "1.4fr",
			link: true,
			render: (item) => text(item, "name"),
		},
		{
			key: "class",
			header: "Класс",
			width: "1fr",
			render: (item) => text(item, "class"),
		},
		{
			key: "taskType",
			header: "Тип задачи",
			width: "1.2fr",
			render: (item) => text(item, "taskType"),
		},
		{
			key: "algorithm",
			header: "Алгоритм",
			width: "1fr",
			render: (item) => text(item, "algorithm"),
		},
		{
			key: "role",
			header: "Роль",
			width: "0.9fr",
			render: (item) => text(item, "role"),
		},
	],
	"streamModelControl.models.modelsList": [
		{
			key: "name",
			header: "Название модели",
			width: "1.4fr",
			link: true,
			render: (item) => text(item, "name"),
		},
		{
			key: "class",
			header: "Класс",
			width: "1fr",
			render: (item) => text(item, "class"),
		},
		{
			key: "taskType",
			header: "Тип задачи",
			width: "1.2fr",
			render: (item) => text(item, "taskType"),
		},
		{
			key: "algorithm",
			header: "Алгоритм",
			width: "1fr",
			render: (item) => text(item, "algorithm"),
		},
		{
			key: "role",
			header: "Роль",
			width: "0.9fr",
			render: (item) => text(item, "role"),
		},
	],
	"detailInfo.detailTypicalTasks": TYPICAL_WORK_COLUMNS,
	"detailInfo.detailAtypicalTasks": ATYPICAL_WORK_COLUMNS,
	"streamDataSources.sourceTypicalTasks": TYPICAL_WORK_COLUMNS,
	"streamDataSources.atypicalTasks": ATYPICAL_WORK_COLUMNS,
	"generalInfo.modelService.controlTypicalTasks": TYPICAL_WORK_COLUMNS,
	"streamModelControl.atypicalTasks": ATYPICAL_WORK_COLUMNS,
};

export function arrayTableShowsRowActions(
	path: string,
	formContext: unknown,
): boolean {
	const ctx = readAnketaFormContext(formContext);
	if (ctx.anketaModalArrayPaths) {
		return ctx.anketaModalArrayPaths.has(path);
	}
	return true;
}

const ARRAY_TABLE_PREVIEW_COLUMN_LIMIT = 5;

/** Колонки компактной таблицы массива из jsonSchema (title полей элемента). */
export function getArrayTableColumnsFromSchema(
	rootSchema: RJSFSchema | undefined,
	rootUi: UiSchema | undefined,
	path: string,
): AnketaArrayTableColumn[] | null {
	if (!rootSchema || !rootUi) return null;
	const slice = getArrayItemSchemaSliceForModal(rootSchema, rootUi, path);
	const props = slice?.schema.properties as
		| Record<string, RJSFSchema>
		| undefined;
	if (!props) return null;
	const keys = Object.keys(props);
	if (keys.length === 0) return null;
	return keys.slice(0, ARRAY_TABLE_PREVIEW_COLUMN_LIMIT).map((key) => {
		const field = props[key];
		const title =
			typeof field?.title === "string" && field.title.trim()
				? field.title.trim()
				: key;
		return {
			key,
			header: title,
			render: (item) => text(item, key),
		};
	});
}

export function getTypicalWorkFactoryTableColumns(): AnketaArrayTableColumn[] {
	return FACTORY_TYPICAL_WORK_COLUMNS.map((column) => ({ ...column }));
}

/** Элемент массива похож на типовую работу (в т.ч. legacy reason/workType). */
export function schemaItemsLookLikeTypicalWork(
	rootSchema: RJSFSchema | undefined,
	rootUi: UiSchema | undefined,
	path: string,
): boolean {
	if (!rootSchema || !rootUi) return false;
	const slice = getArrayItemSchemaSliceForModal(rootSchema, rootUi, path);
	const props = slice?.schema.properties as
		| Record<string, RJSFSchema>
		| undefined;
	if (!props) return false;
	const keys = new Set(Object.keys(props));
	if (keys.has("estimateHoursPerDay") && keys.has("total")) return true;
	if (keys.has("reason") && keys.has("workType") && keys.has("total")) {
		return true;
	}
	return false;
}

function readUiBranchAtDotPath(
	uiSchema: unknown,
	dotPath: string,
): Record<string, unknown> | undefined {
	const segments = dotPath.split(".").filter(Boolean);
	let cur: unknown = uiSchema;
	for (const segment of segments) {
		if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
		cur = (cur as Record<string, unknown>)[segment];
	}
	return cur && typeof cur === "object" && !Array.isArray(cur)
		? (cur as Record<string, unknown>)
		: undefined;
}

export function resolveArrayTableColumns(
	path: string,
	rootSchema?: RJSFSchema,
	rootUi?: UiSchema,
): AnketaArrayTableColumn[] | null {
	if (
		isTypicalWorkArrayPath(path, rootUi as Record<string, unknown> | undefined) ||
		schemaItemsLookLikeTypicalWork(rootSchema, rootUi, path)
	) {
		return getTypicalWorkFactoryTableColumns();
	}
	return (
		getArrayTableColumnsFromSchema(rootSchema, rootUi, path) ??
		getArrayTableColumns(path)
	);
}

export function getArrayTableColumns(
	path: string,
): AnketaArrayTableColumn[] | null {
	return (
		(ANKETA_ARRAY_TABLE_COLUMNS as Record<string, AnketaArrayTableColumn[]>)[
			path
		] ?? null
	);
}

const TYPICAL_WORK_ARRAY_PATHS = new Set([
	"detailInfo.detailTypicalTasks",
	"streamDataSources.sourceTypicalTasks",
	"generalInfo.modelService.controlTypicalTasks",
]);

export function isTypicalWorkArrayPath(
	path: string,
	uiSchema?: Record<string, unknown>,
): boolean {
	if (TYPICAL_WORK_ARRAY_PATHS.has(path)) return true;
	if (!uiSchema) return false;
	if (collectGeneratedTypicalWorkArrayPaths(uiSchema).includes(path)) {
		return true;
	}
	const branch = readUiBranchAtDotPath(uiSchema, path);
	return resolveV2AnketaArchComponent(branch) === "typicalWork";
}

export function sumTypicalWorkTotals(
	items: Record<string, unknown>[],
): number | null {
	let sum = 0;
	let hasValue = false;
	for (const item of items) {
		const num = normalizeTypicalWorkTotalValue(item.total);
		if (num == null) continue;
		sum += num;
		hasValue = true;
	}
	return hasValue ? sum : null;
}

export function formatTypicalWorkSummaryTotal(
	total: number | null,
	options?: { loading?: boolean },
): string {
	if (options?.loading && total == null) return "…";
	if (total != null) return formatTypicalWorkNumberValue(total);
	return "—";
}

export function collectTypicalWorkSourceNames(
	items: Record<string, unknown>[],
): string[] {
	const names = new Set<string>();
	for (const item of items) {
		const raw = item.sourceName;
		if (typeof raw === "string" && raw.trim()) names.add(raw.trim());
	}
	return [...names].sort((a, b) => a.localeCompare(b, "ru"));
}

export function filterTypicalWorkItems(
	items: Record<string, unknown>[],
	sourceNameFilter: string | null,
): Record<string, unknown>[] {
	if (!sourceNameFilter) return items;
	return items.filter((item) => {
		const raw = item.sourceName;
		return typeof raw === "string" && raw.trim() === sourceNameFilter;
	});
}

export function typicalWorkItemDisplayName(
	item: Record<string, unknown>,
	fallbackIndex: number,
): string {
	const raw = item.name;
	if (typeof raw === "string" && raw.trim()) return raw.trim();
	return `Работа ${fallbackIndex + 1}`;
}

function isAppearedTypicalWorkRow(row: Record<string, unknown>): boolean {
	if (
		typeof row.generatedByRuleId === "string" &&
		row.generatedByRuleId.trim()
	) {
		return true;
	}
	const name = typeof row.name === "string" ? row.name.trim() : "";
	if (!name) return false;
	if (typeof row.workId === "string" && row.workId.trim()) return true;
	return (
		normalizeTypicalWorkTotalValue(row.estimateHoursPerDay) != null ||
		normalizeTypicalWorkTotalValue(row.coefficient) != null ||
		normalizeTypicalWorkTotalValue(row.total) != null
	);
}

function typicalWorkRowDedupKey(row: Record<string, unknown>): string {
	const workId = typeof row.workId === "string" ? row.workId.trim() : "";
	if (workId) return workId;
	return [
		typeof row.taskCode === "string" ? row.taskCode.trim() : "",
		typeof row.name === "string" ? row.name.trim() : "",
		typeof row.sourceName === "string" ? row.sourceName.trim() : "",
		typeof row.generatedByRuleId === "string" ? row.generatedByRuleId.trim() : "",
	].join("|");
}

function resolveTypicalWorkCollectionPaths(
	uiSchema?: Record<string, unknown>,
): string[] {
	if (uiSchema) {
		const activePaths = collectGeneratedTypicalWorkArrayPaths(uiSchema);
		if (activePaths.length > 0) return activePaths;
	}
	return listAllGeneratedTypicalWorkArrayPaths(uiSchema);
}

export type AppearedTypicalWorkGroup = {
	path: string;
	streamExecutor: string | null;
	rows: Record<string, unknown>[];
};

function readTypicalWorkArrayAtPath(
	formData: Record<string, unknown> | null | undefined,
	liveFormData: Record<string, unknown> | null | undefined,
	path: string,
): Record<string, unknown>[] {
	const liveRows = liveFormData ? getArrayAtPath(liveFormData, path) : [];
	if (liveRows.length > 0) return liveRows;
	return formData ? getArrayAtPath(formData, path) : [];
}

/** Строки типовых работ, появившиеся после срабатывания триггеров (для итоговой панели). */
export function collectAppearedTypicalWorkRows(
	formData: Record<string, unknown> | null | undefined,
	uiSchema?: Record<string, unknown>,
	liveFormData?: Record<string, unknown> | null,
): Record<string, unknown>[] {
	return collectAppearedTypicalWorkGroups(formData, uiSchema, liveFormData).flatMap(
		(group) => group.rows,
	);
}

/** Типовые работы, сгруппированные по пути вывода и стриму-исполнителю. */
export function collectAppearedTypicalWorkGroups(
	formData: Record<string, unknown> | null | undefined,
	uiSchema?: Record<string, unknown>,
	liveFormData?: Record<string, unknown> | null,
): AppearedTypicalWorkGroup[] {
	if (!formData && !liveFormData) return [];

	const paths = resolveTypicalWorkCollectionPaths(uiSchema);
	const globalWorkIdsSeen = new Set<string>();
	const groups: AppearedTypicalWorkGroup[] = [];

	for (const path of paths) {
		const streamExecutor = resolveTypicalWorkCatalogStreamLabel(
			uiSchema,
			path,
		);
		const appeared = readTypicalWorkArrayAtPath(
			formData,
			liveFormData,
			path,
		).filter(isAppearedTypicalWorkRow);
		const collapsed = dedupeTypicalWorkRowsByWorkId(appeared, {
			groupBySourceName: streamExecutor === "Источники данных",
		});
		const rows: Record<string, unknown>[] = [];
		for (const item of collapsed) {
			const workId = typeof item.workId === "string" ? item.workId.trim() : "";
			if (workId) {
				if (globalWorkIdsSeen.has(workId)) continue;
				globalWorkIdsSeen.add(workId);
			} else {
				const key = typicalWorkRowDedupKey(item);
				if (globalWorkIdsSeen.has(`fb:${key}`)) continue;
				globalWorkIdsSeen.add(`fb:${key}`);
			}
			rows.push(item);
		}
		if (rows.length === 0) continue;
		groups.push({
			path,
			streamExecutor,
			rows:
				streamExecutor === V2_MODEL_STREAM_EXECUTOR
					? sortModelStreamTypicalWorkRows(rows)
					: rows,
		});
	}

	return groups;
}

/** Колонки таблицы типовых работ: всегда заводской шаблон (игнор legacy schema). */
export function adjustTypicalWorkTableColumns(
	_columns: AnketaArrayTableColumn[],
	_items: Record<string, unknown>[],
): AnketaArrayTableColumn[] {
	return getTypicalWorkFactoryTableColumns();
}

export function getArrayAtPath(
	data: Record<string, unknown>,
	path: string,
): Record<string, unknown>[] {
	const parts = path.split(".");
	let current: unknown = data;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return [];
		current = (current as Record<string, unknown>)[part];
	}
	if (!Array.isArray(current)) return [];
	return current.filter(
		(item): item is Record<string, unknown> =>
			item != null && typeof item === "object" && !Array.isArray(item),
	);
}

export function getValueAtPath(
	data: Record<string, unknown>,
	path: string,
): unknown {
	const parts = path.split(".");
	let current: unknown = data;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/** Сумма элементов массивов + заполненных числовых/boolean полей в подразделе. */
export function countSubsectionFilledItems(value: unknown): number {
	if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
	let count = 0;
	for (const v of Object.values(value as Record<string, unknown>)) {
		if (Array.isArray(v)) count += v.length;
		else if (typeof v === "number" && v > 0) count += 1;
		else if (v === true) count += 1;
	}
	return count;
}
