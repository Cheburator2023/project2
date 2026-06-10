import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { AnketaCompactArrayTablePath } from "./anketaFormModalPaths";
import { getArrayItemSchemaSliceForModal } from "./anketaSchemaAtPath";
import { readAnketaFormContext } from "./anketaFormContext";

export type AnketaArrayTableColumn = {
	key: string;
	header: string;
	width?: string;
	render?: (item: Record<string, unknown>) => string;
	field?: string;
	chip?: boolean;
	link?: boolean;
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

const TYPICAL_WORK_COLUMNS: AnketaArrayTableColumn[] = [
	{
		key: "name",
		header: "Наименование",
		width: "1.5fr",
		link: true,
		render: (item) => text(item, "name"),
	},
	{
		key: "workType",
		header: "Тип работ",
		width: "1.1fr",
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
	"streamModelControl.control.controlTypicalTasks": TYPICAL_WORK_COLUMNS,
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
	const props = slice?.schema.properties as Record<string, RJSFSchema> | undefined;
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

export function resolveArrayTableColumns(
	path: string,
	rootSchema?: RJSFSchema,
	rootUi?: UiSchema,
): AnketaArrayTableColumn[] | null {
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
