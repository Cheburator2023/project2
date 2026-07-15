import type { ColDef, ColGroupDef, ColumnState } from "ag-grid-community";
import {
	registryFormColumnId,
	type V2RegistrySchemaColumnOptions,
} from "@smart-anketa/api-contract";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { buildV2QuestionnaireColumnDefs } from "./v2QuestionnaireGridColumns";

export const FACTORY_PRESET_IDS = {
	default: "factory:default",
	allInformation: "factory:all-information",
} as const;

export type FactoryGridPreset = {
	id: string;
	name: string;
	description: string;
	builtIn: true;
	columnState: ColumnState[];
	filterModel: Record<string, unknown> | null;
};

/** API грида, достаточный для применения преднастройки. */
export type QuestionnaireGridPresetApi = {
	resetColumnState: () => void;
	applyColumnState: (params: {
		state: ColumnState[];
		applyOrder?: boolean;
		defaultState?: Partial<ColumnState>;
	}) => void;
	setFilterModel: (model: Record<string, unknown> | null) => void;
	onFilterChanged: () => void;
};

const PRIMARY_NAME_COL_ID = "calcName";

function pathCol(path: string): string {
	return registryFormColumnId(path);
}

function collectLeafColumnIds(
	defs: Array<ColDef<V2QuestionnaireGridRow> | ColGroupDef<V2QuestionnaireGridRow>>,
): string[] {
	const ids: string[] = [];
	for (const def of defs) {
		if ("children" in def && def.children?.length) {
			ids.push(
				...collectLeafColumnIds(
					def.children as Array<
						ColDef<V2QuestionnaireGridRow> | ColGroupDef<V2QuestionnaireGridRow>
					>,
				),
			);
			continue;
		}
		const leaf = def as ColDef<V2QuestionnaireGridRow>;
		if (leaf.colId) ids.push(leaf.colId);
	}
	return ids;
}

function buildColumnState(
	allIds: string[],
	visibleOrdered: string[],
): ColumnState[] {
	const visibleSet = new Set(visibleOrdered);
	const ordered = [
		PRIMARY_NAME_COL_ID,
		...visibleOrdered.filter(
			(colId) => colId !== PRIMARY_NAME_COL_ID && allIds.includes(colId),
		),
		...allIds.filter((colId) => !visibleSet.has(colId)),
	];
	const seen = new Set<string>();
	const uniqueOrdered = ordered.filter((colId) => {
		if (seen.has(colId)) return false;
		seen.add(colId);
		return colId === PRIMARY_NAME_COL_ID || allIds.includes(colId);
	});

	return uniqueOrdered.map((colId) => ({
		colId,
		hide: colId !== PRIMARY_NAME_COL_ID && !visibleSet.has(colId),
	}));
}

/** Базовый вид реестра анкет по умолчанию. */
const DEFAULT_REGISTRY_VISIBLE = [
	PRIMARY_NAME_COL_ID,
	"readableId",
	"createdAt",
	pathCol("generalInfo.businessCustomer"),
	pathCol("generalInfo.implementationStream"),
	"version",
	"workflowGlobalStatus",
	"workflowSection.generalInfo",
	"workflowSection.detailInfo",
	"workflowSection.streamDataSources",
	"workflowSection.streamModelControl",
	pathCol("summary.total"),
	"updatedAt",
];

/** Сбрасывает только фильтры, порядок и видимость колонок не меняет. */
export function clearQuestionnaireGridFilters(
	api: Pick<QuestionnaireGridPresetApi, "setFilterModel" | "onFilterChanged">,
): void {
	api.setFilterModel(null);
	api.onFilterChanged();
}

/** Сбрасывает фильтры/сортировку и применяет преднастройку колонок. */
export function applyQuestionnaireGridPreset(
	api: QuestionnaireGridPresetApi,
	preset: Pick<FactoryGridPreset, "columnState" | "filterModel">,
): void {
	api.setFilterModel(null);
	api.resetColumnState();
	api.applyColumnState({
		state: preset.columnState,
		applyOrder: true,
		defaultState: {
			sort: null,
			rowGroup: false,
			pivot: false,
			pinned: null,
		},
	});
	api.setFilterModel(preset.filterModel ?? null);
	api.onFilterChanged();
}

export function getAllGridColumnIds(
	jsonSchema?: Record<string, unknown>,
	uiSchema?: Record<string, unknown>,
	options?: V2RegistrySchemaColumnOptions,
): string[] {
	return collectLeafColumnIds(
		buildV2QuestionnaireColumnDefs(jsonSchema, uiSchema, options),
	);
}

function buildFactoryPresets(
	jsonSchema?: Record<string, unknown>,
	uiSchema?: Record<string, unknown>,
	options?: V2RegistrySchemaColumnOptions,
): FactoryGridPreset[] {
	const allIds = getAllGridColumnIds(jsonSchema, uiSchema, options);
	return [
		{
			id: FACTORY_PRESET_IDS.default,
			name: "Базовый",
			description:
				"ID, название, даты, заказчик, стрим, версия, статусы разделов и общая стоимость.",
			builtIn: true,
			columnState: buildColumnState(allIds, DEFAULT_REGISTRY_VISIBLE),
			filterModel: null,
		},
		{
			id: FACTORY_PRESET_IDS.allInformation,
			name: "Вся информация",
			description:
				"Все колонки анкеты: реестр, разделы, итоговая оценка и расчёты.",
			builtIn: true,
			columnState: buildColumnState(allIds, [PRIMARY_NAME_COL_ID, ...allIds]),
			filterModel: null,
		},
	];
}

export function getFactoryGridPresets(
	jsonSchema?: Record<string, unknown>,
	uiSchema?: Record<string, unknown>,
	options?: V2RegistrySchemaColumnOptions,
): FactoryGridPreset[] {
	return buildFactoryPresets(jsonSchema, uiSchema, options);
}

export function getFactoryGridPreset(
	id: string,
	jsonSchema?: Record<string, unknown>,
	uiSchema?: Record<string, unknown>,
	options?: V2RegistrySchemaColumnOptions,
): FactoryGridPreset | undefined {
	return getFactoryGridPresets(jsonSchema, uiSchema, options).find(
		(preset) => preset.id === id,
	);
}

export function isFactoryPresetId(id: string): boolean {
	return (Object.values(FACTORY_PRESET_IDS) as string[]).includes(id);
}

/** @deprecated используйте getFactoryGridPresets(schema) */
export const FACTORY_GRID_PRESETS: FactoryGridPreset[] = buildFactoryPresets();
