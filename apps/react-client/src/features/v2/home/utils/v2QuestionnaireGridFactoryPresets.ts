import type { ColDef, ColGroupDef, ColumnState } from "ag-grid-community";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { buildV2QuestionnaireColumnDefs } from "./v2QuestionnaireGridColumns";
import { formPathColId } from "./v2QuestionnaireGridValue";

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
	refreshHeader?: () => void;
};

const AUTO_GROUP_COL_ID = "ag-Grid-AutoColumn";

function pathCol(path: string): string {
	return formPathColId(path);
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
		AUTO_GROUP_COL_ID,
		...visibleOrdered.filter(
			(colId) => colId !== AUTO_GROUP_COL_ID && allIds.includes(colId),
		),
		...allIds.filter((colId) => !visibleSet.has(colId)),
	];
	const seen = new Set<string>();
	const uniqueOrdered = ordered.filter((colId) => {
		if (seen.has(colId)) return false;
		seen.add(colId);
		return colId === AUTO_GROUP_COL_ID || allIds.includes(colId);
	});

	return uniqueOrdered.map((colId) => ({
		colId,
		hide: colId !== AUTO_GROUP_COL_ID && !visibleSet.has(colId),
	}));
}

function buildAllColumnsVisibleState(): ColumnState[] {
	return buildColumnState(getAllGridColumnIds(), [
		AUTO_GROUP_COL_ID,
		...getAllGridColumnIds(),
	]);
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
	api.refreshHeader?.();
}

export function getFactoryGridPreset(id: string): FactoryGridPreset | undefined {
	return FACTORY_GRID_PRESETS.find((preset) => preset.id === id);
}

/** Базовый вид реестра анкет по умолчанию. */
const DEFAULT_REGISTRY_VISIBLE = [
	AUTO_GROUP_COL_ID,
	"readableId",
	pathCol("generalInfo.calcName"),
	"createdAt",
	pathCol("generalInfo.businessCustomer"),
	pathCol("generalInfo.implementationStream"),
	"version",
	"workflowGlobalStatus",
	"workflowSection.generalInfo",
	"workflowSection.detailInfo",
	"workflowSection.streamDataSources",
	"workflowSection.streamMlPlatform",
	"workflowSection.streamModelControl",
	pathCol("summary.total"),
	"updatedAt",
];

let cachedAllColumnIds: string[] | null = null;

export function getAllGridColumnIds(): string[] {
	if (!cachedAllColumnIds) {
		cachedAllColumnIds = collectLeafColumnIds(buildV2QuestionnaireColumnDefs());
	}
	return cachedAllColumnIds;
}

export function isFactoryPresetId(id: string): boolean {
	return (Object.values(FACTORY_PRESET_IDS) as string[]).includes(id);
}

export const FACTORY_GRID_PRESETS: FactoryGridPreset[] = [
	{
		id: FACTORY_PRESET_IDS.default,
		name: "Базовый",
		description:
			"ID, название, даты, заказчик, стрим, версия, статусы разделов и общая стоимость.",
		builtIn: true,
		columnState: buildColumnState(
			getAllGridColumnIds(),
			DEFAULT_REGISTRY_VISIBLE,
		),
		filterModel: null,
	},
	{
		id: FACTORY_PRESET_IDS.allInformation,
		name: "Вся информация",
		description: "Все колонки анкеты: реестр, разделы, итоговая оценка и расчёты.",
		builtIn: true,
		columnState: buildAllColumnsVisibleState(),
		filterModel: null,
	},
];
