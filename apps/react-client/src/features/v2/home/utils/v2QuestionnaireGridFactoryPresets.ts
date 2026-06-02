import type { ColDef, ColGroupDef, ColumnState } from "ag-grid-community";
import type { V2QuestionnaireGridRow } from "../types/v2QuestionnaireGrid.types";
import { buildV2QuestionnaireColumnDefs } from "./v2QuestionnaireGridColumns";
import { formPathColId } from "./v2QuestionnaireGridValue";

export const FACTORY_PRESET_IDS = {
	platformStreams: "factory:platform-streams",
	model: "factory:model",
} as const;

export type FactoryGridPreset = {
	id: string;
	name: string;
	description: string;
	builtIn: true;
	columnState: ColumnState[];
	filterModel: Record<string, unknown> | null;
};

const AUTO_GROUP_COL_ID = "ag-Grid-AutoColumn";

function pathCol(path: string): string {
	return formPathColId(path);
}

function arrayCols(
	basePath: string,
	indices: number[],
	keys: string[],
): string[] {
	return indices.flatMap((index) =>
		keys.map((key) => pathCol(`${basePath}[${index}].${key}`)),
	);
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

/** Платформенные стримы: оценка по стримам, E2E, процессы данных (IND). */
const PLATFORM_STREAMS_VISIBLE = [
	AUTO_GROUP_COL_ID,
	"readableId",
	"version",
	"author",
	"finalCoefficient",
	pathCol("generalInfo.calcName"),
	pathCol("generalInfo.implementationStream"),
	pathCol("generalInfo.complexity"),
	pathCol("generalInfo.channels"),
	pathCol("generalInfo.pilotNeed"),
	pathCol("summary.baseScoreStream"),
	pathCol("summary.scoreWithComplexityCoeff"),
	pathCol("summary.deviationFromBaseline"),
	...arrayCols("summary.platformStreams", [0, 1, 2, 3], [
		"streamName",
		"baseTypicalScore",
		"adjustedTypicalScore",
		"deviationPercent",
		"atypicalScore",
	]),
	...arrayCols("summary.detailedCalculation", [0, 1, 2, 3, 4], [
		"stageName",
		"baseScore",
		"complexityCoeff",
		"deviationFromBase",
	]),
	pathCol("dataProcessing.sourcesRDS"),
	pathCol("dataProcessing.consumers"),
	pathCol("dataProcessing.otherMicroservices"),
	pathCol("dataProcessing.filters"),
	pathCol("dataProcessing.yaspArtifact"),
];

/** Модельные: параметры модели, список моделей, витрины (Контроль моделей / ПиРМ). */
const MODEL_VISIBLE = [
	AUTO_GROUP_COL_ID,
	"readableId",
	"version",
	"author",
	"finalCoefficient",
	pathCol("generalInfo.calcName"),
	pathCol("generalInfo.businessCustomer"),
	pathCol("generalInfo.implementationStream"),
	pathCol("generalInfo.complexity"),
	pathCol("generalInfo.overallUncertainty"),
	pathCol("generalInfo.pilotNeed"),
	pathCol("uncertaintyCalculation.initiativeTimeline"),
	pathCol("uncertaintyCalculation.initiativeCost"),
	pathCol("uncertaintyCalculation.uncertaintyAdjustment"),
	pathCol("uncertaintyCalculation.riskGroup.businessComplexity"),
	pathCol("uncertaintyCalculation.riskGroup.regulatoryChanges"),
	pathCol("uncertaintyCalculation.riskGroup.itArchitectureChanges"),
	pathCol("detailInfo.parameters.modelsCount"),
	pathCol("detailInfo.parameters.algorithmType"),
	pathCol("detailInfo.parameters.algorithmCoeff"),
	pathCol("detailInfo.parameters.autoML"),
	pathCol("detailInfo.parameters.specialist"),
	pathCol("detailInfo.parameters.cascadeEnsemble"),
	pathCol("models.cascadeEnsemble"),
	pathCol("models.recalibrationType"),
	...arrayCols("models.modelsList", [0, 1], [
		"name",
		"class",
		"taskType",
		"algorithm",
		"autoML",
		"role",
	]),
	...arrayCols("dataObjects.trainingSources", [0, 1], [
		"name",
		"frequency",
		"development",
		"integration",
		"usedModels",
		"controlKD",
	]),
	...arrayCols("dataObjects.applicationSources", [0], [
		"name",
		"mode",
		"updateFrequency",
		"development",
		"controlKD",
		"usedModels",
	]),
	pathCol("summary.baseScoreStream"),
	pathCol("summary.scoreWithComplexityCoeff"),
	...arrayCols("summary.platformStreams", [0, 1], [
		"streamName",
		"baseTypicalScore",
		"adjustedTypicalScore",
		"deviationPercent",
		"atypicalScore",
	]),
];

let cachedAllColumnIds: string[] | null = null;

export function getAllGridColumnIds(): string[] {
	if (!cachedAllColumnIds) {
		cachedAllColumnIds = collectLeafColumnIds(buildV2QuestionnaireColumnDefs());
	}
	return cachedAllColumnIds;
}

export function isFactoryPresetId(id: string): boolean {
	return (
		id === FACTORY_PRESET_IDS.platformStreams || id === FACTORY_PRESET_IDS.model
	);
}

export const FACTORY_GRID_PRESETS: FactoryGridPreset[] = [
	{
		id: FACTORY_PRESET_IDS.platformStreams,
		name: "Платформенные стримы",
		description:
			"Итоговая оценка, платформенные стримы, E2E-этапы и процессы обработки данных.",
		builtIn: true,
		columnState: buildColumnState(
			getAllGridColumnIds(),
			PLATFORM_STREAMS_VISIBLE,
		),
		filterModel: null,
	},
	{
		id: FACTORY_PRESET_IDS.model,
		name: "Модельные",
		description:
			"Параметры модели, список моделей, витрины и ключевые поля контроля моделей.",
		builtIn: true,
		columnState: buildColumnState(getAllGridColumnIds(), MODEL_VISIBLE),
		filterModel: null,
	},
];
