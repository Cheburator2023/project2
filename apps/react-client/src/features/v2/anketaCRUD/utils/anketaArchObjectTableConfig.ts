import type { AnketaModalObjectPath } from "./anketaFormModalPaths";
import { getValueAtPath } from "./anketaModalArrayTableConfig";

export type AnketaObjectTableColumn = {
	key: string;
	header: string;
	render: (item: Record<string, unknown>) => string;
};

function text(item: Record<string, unknown>, field: string): string {
	const value = item[field];
	if (value == null || value === "") return "—";
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
	return Object.values(item).some((v) => {
		if (v == null || v === "") return false;
		if (Array.isArray(v)) return v.length > 0;
		if (typeof v === "object") return Object.keys(v as object).length > 0;
		return true;
	});
}
