import { isPositiveBinaryFormValue } from "@smart-anketa/api-contract";
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

export function resolveLegacyFormContext(
	data: Record<string, unknown>,
): V2LegacyFormContext {
	const generalInfo = readRecord(data.generalInfo);
	const detailInfo = readRecord(data.detailInfo);
	const streamModelControl = readRecord(data.streamModelControl);
	const streamDataSources = readRecord(data.streamDataSources);
	const uncertainty = readRecord(data.uncertaintyCalculation);

	const detailParams =
		readRecord(detailInfo?.model) ?? readRecord(detailInfo?.parameters);
	const modelService = readArchObjectRecord(generalInfo?.modelService);
	const dataMart =
		readArchObjectRecord(detailInfo?.dataMart) ??
		readArchObjectRecord(streamModelControl?.dataObjects);

	const modelsList =
		readArray(detailInfo?.modelsList).length > 0
			? readArray(detailInfo?.modelsList)
			: readArray(readRecord(streamModelControl?.models)?.modelsList).length > 0
				? readArray(readRecord(streamModelControl?.models)?.modelsList)
				: readArray(readRecord(data.models)?.modelsList);

	const modelsCountFromList = modelsList.length;
	const modelsCount =
		modelsCountFromList > 0
			? modelsCountFromList
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
	const singleType = detailParams?.algorithmType;
	if (typeof singleType === "string" && singleType.trim()) {
		algorithmTypes.push(singleType.trim());
	}

	const autoMlFromList = modelsList.some((model) =>
		isPositiveBinaryFormValue(readRecord(model)?.autoML),
	);
	const autoMlRequired: "Да" | "Не требуется" =
		autoMlFromList || isPositiveBinaryFormValue(detailParams?.autoML)
			? "Да"
			: "Не требуется";

	const pilotFromLegacy = String(generalInfo?.pilotNeed ?? "");
	const pilotFromModelService =
		isPositiveBinaryFormValue(modelService?.field_o_HRj6VO) ||
		isPositiveBinaryFormValue(modelService?.prePromEval);
	const pilotModelRequired: "Да" | "Не требуется" =
		pilotFromLegacy.includes("MVP") ||
		pilotFromLegacy === "Требуется" ||
		pilotFromModelService
			? "Да"
			: "Не требуется";
	const pilotSupportRequired: "Да" | "Не требуется" =
		pilotFromLegacy === "Требуется" ||
		isPositiveBinaryFormValue(modelService?.prePromEval)
			? "Да"
			: pilotModelRequired;

	const deploymentChannels = resolveDeploymentChannels(generalInfo, modelService);

	const sourceRows = [
		...readArray(detailInfo?.sourceSystems),
		...readArray(streamDataSources?.sourceSystems),
	];
	const namedSources = countFilledNamedRows(sourceRows);
	const dataProcessing =
		readRecord(detailInfo?.dataProcess) ??
		readRecord(streamModelControl?.dataProcessing) ??
		readRecord(data.dataProcessing);
	const dataSourcesCount = Math.max(
		1,
		namedSources ||
			Number(dataProcessing?.sourcesRDS) ||
			readArray(
				readRecord(streamModelControl?.dataObjects)?.trainingSources,
			).length ||
			readArray(readRecord(data.dataObjects)?.trainingSources).length ||
			1,
	);

	const readyPromReports: "Да" | "Нет" =
		isPositiveBinaryFormValue(dataMart?.readyPromReports) ||
		isPositiveBinaryFormValue(dataMart?.field_lovKvLZc) ||
		dataMart?.field_le47srI7 === "Да"
			? "Да"
			: "Нет";

	const productionAdditionalReportsRaw = generalInfo?.productionAdditionalReports;
	const productionAdditionalReports =
		typeof productionAdditionalReportsRaw === "string" &&
		productionAdditionalReportsRaw.trim()
			? productionAdditionalReportsRaw.trim()
			: (() => {
					const metricsCount =
						parseFormNumber(dataMart?.metricsCount) ??
						parseFormNumber(dataMart?.field_28IPlEQu);
					return metricsCount !== null && metricsCount >= 1
						? String(Math.min(99, Math.floor(metricsCount)))
						: "1";
				})();

	const assessedInitiativesCount = Math.min(
		99,
		Math.max(
			1,
			parseFormNumber(generalInfo?.assessedInitiativesCount) ?? 1,
		),
	);

	const uncertaintyAdjustmentPercent =
		parseFormNumber(uncertainty?.field_QCwwo5c5) ??
		parseFormNumber(uncertainty?.uncertaintyAdjustment) ??
		0;

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
): string[] {
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
