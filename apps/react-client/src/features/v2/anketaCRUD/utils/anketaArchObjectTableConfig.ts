import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { AnketaModalObjectPath } from "./anketaFormModalPaths";
import { getObjectSchemaSliceForModal } from "./anketaSchemaAtPath";
import { getValueAtPath } from "./anketaModalArrayTableConfig";

export type AnketaObjectTableColumn = {
	key: string;
	header: string;
	render: (item: Record<string, unknown>) => string;
};

/** Есть ли у поля осмысленное значение (не дефолт «пусто»). */
export function isMeaningfulAnketaFieldValue(value: unknown): boolean {
	if (value == null || value === "") return false;
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return Number.isFinite(value) && value !== 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "object") {
		return Object.values(value as Record<string, unknown>).some(
			isMeaningfulAnketaFieldValue,
		);
	}
	return true;
}

function text(item: Record<string, unknown>, field: string): string {
	const value = item[field];
	if (value == null || value === "") return "—";
	if (typeof value === "boolean") return value ? "Да" : "—";
	if (Array.isArray(value)) {
		return value.length > 0 ? value.map(String).join(", ") : "—";
	}
	return String(value);
}

export const ANKETA_OBJECT_TABLE_COLUMNS: Record<
	AnketaModalObjectPath,
	AnketaObjectTableColumn[]
> = {
	"generalInfo.modelService": [
		{
			key: "workType",
			header: "Тип работ",
			render: (item) => text(item, "workType"),
		},
		{
			key: "modelClass",
			header: "Класс моделей",
			render: (item) => text(item, "modelClass"),
		},
		{
			key: "deployChannels",
			header: "Каналы",
			render: (item) => text(item, "deployChannels"),
		},
	],
	"detailInfo.dataProcess": [
		{
			key: "workType",
			header: "Тип работ",
			render: (item) => text(item, "workType"),
		},
		{
			key: "implComplexity",
			header: "Сложность",
			render: (item) => text(item, "implComplexity"),
		},
		{
			key: "deliveryMode",
			header: "Данные заказчику",
			render: (item) => text(item, "deliveryMode"),
		},
	],
	"detailInfo.dataMart": [
		{
			key: "workType",
			header: "Тип работ",
			render: (item) => text(item, "workType"),
		},
		{
			key: "metricsCount",
			header: "Метрики",
			render: (item) => text(item, "metricsCount"),
		},
		{
			key: "integrationReadiness",
			header: "Интеграция",
			render: (item) => text(item, "integrationReadiness"),
		},
	],
};

export function getObjectTableColumns(
	path: string,
): AnketaObjectTableColumn[] | null {
	return (
		(ANKETA_OBJECT_TABLE_COLUMNS as Record<string, AnketaObjectTableColumn[]>)[
			path
		] ?? null
	);
}

const OBJECT_TABLE_PREVIEW_COLUMN_LIMIT = 3;

/** Колонки компактной таблицы арх. объекта из jsonSchema (title полей). */
export function getObjectTableColumnsFromSchema(
	rootSchema: RJSFSchema | undefined,
	rootUi: UiSchema | undefined,
	path: string,
): AnketaObjectTableColumn[] | null {
	if (!rootSchema || !rootUi) return null;
	const slice = getObjectSchemaSliceForModal(rootSchema, rootUi, path);
	const props = slice?.schema.properties as Record<string, RJSFSchema> | undefined;
	if (!props) return null;
	const keys = Object.keys(props);
	if (keys.length === 0) return null;
	return keys.slice(0, OBJECT_TABLE_PREVIEW_COLUMN_LIMIT).map((key) => {
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

export function resolveObjectTableColumns(
	path: string,
	rootSchema?: RJSFSchema,
	rootUi?: UiSchema,
): AnketaObjectTableColumn[] | null {
	return (
		getObjectTableColumnsFromSchema(rootSchema, rootUi, path) ??
		getObjectTableColumns(path)
	);
}

export function getObjectAtPath(
	data: Record<string, unknown>,
	path: string,
): Record<string, unknown> {
	const value = getValueAtPath(data, path);
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

export function isArchObjectFilled(item: Record<string, unknown>): boolean {
	return Object.values(item).some(isMeaningfulAnketaFieldValue);
}
