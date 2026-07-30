import {
	buildV2SchemaFieldIndex,
	isPositiveBinaryFormValue,
	resolveFormValueBySemanticRole,
	type V2SchemaFieldIndex,
} from "@smart-anketa/api-contract";
import { parseFormNumber } from "./v2-form-number.util";

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

/** Arch object list в storage — массив; в схеме — object. */
function readArchObjectRecord(value: unknown): Record<string, unknown> | undefined {
	if (Array.isArray(value)) {
		for (const item of value) {
			const row = readRecord(item);
			if (row) return row;
		}
		return undefined;
	}
	return readRecord(value);
}

function countFilledNamedRows(rows: unknown[]): number {
	let count = 0;
	for (const row of rows) {
		const name = readRecord(row)?.name;
		if (typeof name === "string" && name.trim()) count += 1;
	}
	return count;
}

export type V2LegacyFormContext = {
	modelsList: unknown[];
	modelsCount: number;
	algorithmTypes: string[];
	autoMlRequired: "Да" | "Не требуется";
	pilotModelRequired: "Да" | "Не требуется";
	pilotSupportRequired: "Да" | "Не требуется";
	deploymentChannels: string[];
	dataSourcesCount: number;
	assessedInitiativesCount: number;
	readyPromReports: "Да" | "Нет";
	productionAdditionalReports: string;
	uncertaintyAdjustmentPercent: number;
};

export type ResolveLegacyFormContextOptions = {
	jsonSchema?: unknown;
	uiSchema?: unknown;
};

function pickBySemanticRole(
	data: Record<string, unknown>,
	index: V2SchemaFieldIndex | null,
	role: string,
	fallback: () => unknown,
): unknown {
	if (!index) return fallback();
	const fromRole = resolveFormValueBySemanticRole(data, index, role);
	return fromRole !== undefined ? fromRole : fallback();
}

export function resolveLegacyFormContext(
	data: Record<string, unknown>,
	options?: ResolveLegacyFormContextOptions,
): V2LegacyFormContext {
	const index =
		options?.jsonSchema != null || options?.uiSchema != null
			? buildV2SchemaFieldIndex(options?.jsonSchema, options?.uiSchema)
			: null;

	const generalInfo = readRecord(data.generalInfo);
	const detailInfo = readRecord(data.detailInfo);
	const streamModelControl = readRecord(data.streamModelControl);
	const streamDataSources = readRecord(data.streamDataSources);
	const uncertainty = readRecord(data.uncertaintyCalculation);

	const detailParams =
		readRecord(detailInfo?.model) ?? readRecord(detailInfo?.parameters);
	const modelService = readArchObjectRecord(
		pickBySemanticRole(data, index, "modelService", () => generalInfo?.modelService),
	);
	const dataMart =
		readArchObjectRecord(detailInfo?.dataMart) ??
		readArchObjectRecord(streamModelControl?.dataObjects);

	const modelsListRaw = pickBySemanticRole(data, index, "modelsList", () => {
		if (readArray(detailInfo?.modelsList).length > 0) return detailInfo?.modelsList;
		if (readArray(readRecord(streamModelControl?.models)?.modelsList).length > 0) {
			return readRecord(streamModelControl?.models)?.modelsList;
		}
		return readRecord(data.models)?.modelsList;
	});
	const modelsList = readArray(modelsListRaw);

	const modelsCountFromList = modelsList.length;
	const modelsCountFromRole = parseFormNumber(
		pickBySemanticRole(data, index, "modelsCount", () => undefined),
	);
	const modelsCount =
		modelsCountFromList > 0
			? modelsCountFromList
			: modelsCountFromRole != null && modelsCountFromRole > 0
				? modelsCountFromRole
				: Math.max(1, Number(detailParams?.modelsCount) || 1);

	const algorithmTypes: string[] = [];
	for (const model of modelsList) {
		const row = readRecord(model);
		const algo =
			(typeof row?.algorithmType === "string" && row.algorithmType.trim()) ||
			(typeof row?.algorithm === "string" && row.algorithm.trim()) ||
			"";
		if (algo) algorithmTypes.push(algo);
	}
	const singleType = pickBySemanticRole(
		data,
		index,
		"algorithmType",
		() => detailParams?.algorithmType,
	);
	if (typeof singleType === "string" && singleType.trim()) {
		algorithmTypes.push(singleType.trim());
	}

	const autoMlFromList = modelsList.some((model) =>
		isPositiveBinaryFormValue(readRecord(model)?.autoML),
	);
	const autoMlFromRole = isPositiveBinaryFormValue(
		pickBySemanticRole(data, index, "autoML", () => detailParams?.autoML),
	);
	const autoMlRequired: "Да" | "Не требуется" =
		autoMlFromList || autoMlFromRole ? "Да" : "Не требуется";

	const pilotFromLegacy = String(
		pickBySemanticRole(data, index, "pilotNeed", () => generalInfo?.pilotNeed) ??
			"",
	);
	const prePromFromRole = pickBySemanticRole(
		data,
		index,
		"prePromEval",
		() => modelService?.prePromEval,
	);
	const pilotFromModelService =
		isPositiveBinaryFormValue(modelService?.field_o_HRj6VO) ||
		isPositiveBinaryFormValue(prePromFromRole);
	const pilotModelRequired: "Да" | "Не требуется" =
		pilotFromLegacy.includes("MVP") ||
		pilotFromLegacy === "Требуется" ||
		pilotFromModelService
			? "Да"
			: "Не требуется";
	const pilotSupportRequired: "Да" | "Не требуется" =
		pilotFromLegacy === "Требуется" || isPositiveBinaryFormValue(prePromFromRole)
			? "Да"
			: pilotModelRequired;

	const deploymentChannels = resolveDeploymentChannels(
		generalInfo,
		modelService,
		modelsList,
		data,
		index,
	);

	const sourceRowsRaw = pickBySemanticRole(data, index, "sourceSystems", () => [
		...readArray(detailInfo?.sourceSystems),
		...readArray(streamDataSources?.sourceSystems),
	]);
	const sourceRows = readArray(sourceRowsRaw);
	const namedSources = countFilledNamedRows(sourceRows);
	const dataProcessing =
		readRecord(detailInfo?.dataProcess) ??
		readRecord(streamModelControl?.dataProcessing) ??
		readRecord(data.dataProcessing);
	const dataSourcesCountFromRole = parseFormNumber(
		pickBySemanticRole(data, index, "dataSourcesCount", () => undefined),
	);
	const dataSourcesCount = Math.max(
		1,
		(dataSourcesCountFromRole != null && dataSourcesCountFromRole > 0
			? dataSourcesCountFromRole
			: namedSources) ||
			Number(dataProcessing?.sourcesRDS) ||
			readArray(
				readRecord(streamModelControl?.dataObjects)?.trainingSources,
			).length ||
			readArray(readRecord(data.dataObjects)?.trainingSources).length ||
			1,
	);

	const readyPromFromModels = modelsList.some((model) =>
		isPositiveBinaryFormValue(readRecord(model)?.readyPromReports),
	);
	// Legacy: на старых анкетах поле иногда лежало на dataMart.
	const readyPromFromDataMart = isPositiveBinaryFormValue(
		dataMart?.readyPromReports,
	);
	const readyPromFromRole = isPositiveBinaryFormValue(
		pickBySemanticRole(data, index, "readyPromReports", () => undefined),
	);
	const readyPromReports: "Да" | "Нет" =
		readyPromFromModels || readyPromFromDataMart || readyPromFromRole
			? "Да"
			: "Нет";

	const productionAdditionalReportsRaw = pickBySemanticRole(
		data,
		index,
		"productionAdditionalReports",
		() => generalInfo?.productionAdditionalReports,
	);
	// Не подставлять metricsCount / «кол-во признаков» — это другой параметр.
	// Пустое поле → дефолт v1 «1» (см. getProductionAdditionalReportsCoefficient).
	const productionAdditionalReports =
		typeof productionAdditionalReportsRaw === "string" &&
		productionAdditionalReportsRaw.trim()
			? productionAdditionalReportsRaw.trim()
			: "1";

	const assessedInitiativesCount = Math.min(
		99,
		Math.max(
			1,
			parseFormNumber(
				pickBySemanticRole(
					data,
					index,
					"assessedInitiativesCount",
					() => generalInfo?.assessedInitiativesCount,
				),
			) ?? 1,
		),
	);

	const uncertaintyAdjustmentPercent =
		parseFormNumber(
			pickBySemanticRole(
				data,
				index,
				"uncertaintyAdjustment",
				() =>
					uncertainty?.field_QCwwo5c5 ?? uncertainty?.uncertaintyAdjustment,
			),
		) ?? 0;

	return {
		modelsList,
		modelsCount,
		algorithmTypes,
		autoMlRequired,
		pilotModelRequired,
		pilotSupportRequired,
		deploymentChannels,
		dataSourcesCount,
		assessedInitiativesCount,
		readyPromReports,
		productionAdditionalReports,
		uncertaintyAdjustmentPercent,
	};
}

function resolveDeploymentChannels(
	generalInfo: Record<string, unknown> | undefined,
	modelService: Record<string, unknown> | undefined,
	modelsList: unknown[],
	data: Record<string, unknown>,
	index: V2SchemaFieldIndex | null,
): string[] {
	const fromModels: string[] = [];
	const seen = new Set<string>();
	for (const model of modelsList) {
		for (const channel of readArray(readRecord(model)?.field_jUm5syZf)) {
			if (typeof channel !== "string" || !channel.trim()) continue;
			if (seen.has(channel)) continue;
			seen.add(channel);
			fromModels.push(channel);
		}
	}
	if (fromModels.length > 0) return fromModels;

	const fromRole = pickBySemanticRole(
		data,
		index,
		"deploymentChannels",
		() => undefined,
	);
	const fromRoleArr = readArray(fromRole).filter(
		(v): v is string => typeof v === "string" && v.trim().length > 0,
	);
	if (fromRoleArr.length > 0) return fromRoleArr;

	// Dual-read: старые анкеты хранили каналы на modelService.
	const fromModelService = readArray(modelService?.field_jUm5syZf).filter(
		(v): v is string => typeof v === "string" && v.trim().length > 0,
	);
	if (fromModelService.length > 0) return fromModelService;

	const channelsRaw = generalInfo?.channels;
	if (typeof channelsRaw === "string" && channelsRaw === "Требуется") {
		return ["Онлайн"];
	}
	return [];
}
