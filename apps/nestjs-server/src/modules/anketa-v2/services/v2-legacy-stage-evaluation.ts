import {
	collectAtypicalWorkRowsFromData,
	isPositiveBinaryFormValue,
	V2_LEGACY_STAGE_SUMMARY_POINTERS,
	V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
	type V2LegacyStageEvaluationDto,
	buildExecutorStreamWorkSummaryRows,
} from "@smart-anketa/api-contract";
import {
	V2_PLATFORM_STREAM_NAMES,
	V2_STAGE_BASE_VALUES,
	V2_STAGE_DISPLAY_NAMES,
	type V2StageKey,
} from "../constants/v2-stage-catalog";
import { resolveLegacyFormContext } from "../utils/v2-legacy-form-context.util";
import { parseLegacyMultiplierLabel } from "../utils/v2-form-number.util";

export { V2_LEGACY_STAGE_SUMMARY_POINTERS };

export type V2DetailedCalculationRow = {
	stageName: string;
	baseScore: number;
	complexityCoeff: number | null;
	deviationFromBase: number | null;
	disabled?: boolean;
};

export type V2PlatformStreamRow = {
	streamName: string;
	baseTypicalScore: number;
	adjustedTypicalScore: number;
	deviationPercent: number | null;
	atypicalScore: number;
};

export type V2LegacySummaryResult = {
	baseScoreStream: number;
	scoreWithComplexityCoeff: number;
	/** Отклонение в процентах: (adjusted / base − 1) × 100 */
	deviationFromBaseline: number;
	detailedCalculation: V2DetailedCalculationRow[];
	platformStreams: V2PlatformStreamRow[];
};

function roundUp2(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.ceil(value * 100 - 1e-9) / 100;
}

function percentDeviation(base: number, adjusted: number): number | null {
	if (!base || !Number.isFinite(base)) return null;
	if (!adjusted && adjusted !== 0) return null;
	return roundUp2(((adjusted / base) - 1) * 100);
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function sumTaskTotals(tasks: unknown[]): number {
	let sum = 0;
	for (const row of tasks) {
		const o = readRecord(row);
		const total = Number(o?.total);
		if (Number.isFinite(total)) sum += total;
	}
	return roundUp2(sum);
}

function sumAtypicalIncluded(tasks: unknown[]): number {
	let sum = 0;
	for (const row of tasks) {
		const o = readRecord(row);
		if (o?.includeInCalculation === false) continue;
		const total = Number(o?.total);
		if (Number.isFinite(total) && total > 0) {
			sum += total;
			continue;
		}
		const estimate = Number(o?.estimateHoursPerDay);
		const coefficient = Number(o?.coefficient);
		if (Number.isFinite(estimate) && Number.isFinite(coefficient)) {
			sum += estimate * coefficient;
		}
	}
	return roundUp2(sum);
}

// --- Коэффициенты (порт v1 `coefficients.ts`, адаптация под поля v2) ---

function parseComplexityCoeff(complexity: string | undefined): number {
	return parseLegacyMultiplierLabel(complexity);
}

function calculateModelsCoefficient(modelsCount: number): number {
	if (modelsCount < 1) return 1;
	if (modelsCount === 1) return 1;
	return 1 + (modelsCount - 1) * 0.75;
}

function calculateDataSourceCoefficient(dataSourceCount: number): number {
	const coefficients: Record<number, number> = {
		0: 1,
		1: 1,
		2: 1.2,
		3: 1.4,
		4: 1.6,
		5: 1.8,
		6: 2,
		7: 2.2,
		8: 2.4,
		9: 2.6,
		10: 3,
	};
	return coefficients[dataSourceCount] ?? 1;
}

function getReadyPromReportsCoefficient(readyPromReports: string): number {
	return readyPromReports === "Да" ? 0.5 : 1;
}

function getPilotModelCoefficient(pilotModelRequired: string): number {
	return pilotModelRequired === "Да" ? 1 : 0;
}

function getPilotSupportCoefficient(pilotSupportRequired: string): number {
	return pilotSupportRequired === "Да" ? 1 : 0;
}

function getAutoMlCoefficient(autoMlRequired: string): number {
	return autoMlRequired === "Да" ? 1 : 0;
}

function getProductionAdditionalReportsCoefficient(value: string): number {
	if (value === "Не требуется") return 0;
	const numValue = Number.parseInt(value, 10);
	if (!Number.isFinite(numValue) || numValue < 1) return 0;
	if (numValue === 1) return 1;
	return 1 + (numValue - 1) * 0.75;
}

const ALGORITHM_TYPE_COEFF: Record<string, number> = {
	Табличные: 0.75,
	"Табличные данные": 0.75,
	"Временные ряды": 1.0,
	NLP: 1.25,
	"Текстовая аналитика_Классические модели": 1.25,
	"Текстовая аналитика_LLM": 1.4,
	"Аудио Аналитика": 1.6,
	"Компьютерное зрение_CV": 1.8,
	CV: 1.8,
	RL: 2.5,
	"Оптимизационная задача": 2.5,
	"Гео-аналитика": 3.0,
	"Графовая аналитика": 3.5,
};

function calculateAlgorithmComplexityCoefficient(
	algorithmTypes: string[],
): number {
	return algorithmTypes.reduce((total, type) => {
		if (!type || !(type in ALGORITHM_TYPE_COEFF)) return total;
		return total + (ALGORITHM_TYPE_COEFF[type] ?? 0);
	}, 0);
}

function mapRiskLevelToCoefficient(level: string): number {
	switch (level) {
		case "Низкий":
			return 0.03;
		case "Средний":
			return 0.05;
		case "Высокий":
			return 0.07;
		case "Очень высокий":
			return 0.1;
		default:
			return 0;
	}
}

function calculateTotalUncertaintyFromRiskGroup(
	riskGroup: Record<string, unknown> | undefined,
	correctionPercent: number,
): number {
	if (!riskGroup) return roundUp2(1 + correctionPercent / 100);
	let sum = 0;
	for (const v of Object.values(riskGroup)) {
		if (typeof v === "string") sum += mapRiskLevelToCoefficient(v);
	}
	return roundUp2(1 + sum + correctionPercent / 100);
}

function calculateDeploymentChannelCoefficient(channels: string[]): number {
	const coefficientMap: Record<string, number> = {
		Батч: 0.5,
		"Батч+загрузка данных потребителю": 0.75,
		"Батч + Онлайн": 1.2,
		Онлайн: 1.0,
		"Онлайн gpu": 1.25,
		Стриминг: 1.5,
		"Мобильные устройства": 1.75,
		LLM: 2.0,
		"Гео-сервисы": 2.25,
		"Внедрение в облаке": 2.5,
		"Графовая платформа": 3.0,
		Требуется: 1.0,
	};
	return channels.reduce((total, channel) => {
		return total + (coefficientMap[channel] ?? 0);
	}, 0);
}

// --- Этапы (порт v1 `stages.ts`) ---

function calculateStage01(
	base: number,
	models: number,
	setup: number,
	uncertainty: number,
	readyProm: number,
): number {
	return roundUp2(base * models * setup * uncertainty * readyProm);
}

function calculateStage02(
	base: number,
	initiatives: number,
	dataSources: number,
	uncertainty: number,
	readyPromReports: string,
	dataSourcesCount: number,
): number {
	if (readyPromReports === "Да" || dataSourcesCount === 0) return 0;
	if (initiatives > 1) {
		return roundUp2((base * uncertainty * dataSources) / initiatives);
	}
	return roundUp2(base * uncertainty * dataSources);
}

function calculateStage04(
	base: number,
	initiatives: number,
	setup: number,
	uncertainty: number,
	readyPromReports: string,
	dataSourcesCount: number,
): number {
	if (readyPromReports === "Да") return 0;
	if (initiatives > 1 && dataSourcesCount !== 0) {
		return roundUp2((base * setup * uncertainty) / initiatives);
	}
	return roundUp2(base * setup * uncertainty);
}

function calculateStage05A(
	base: number,
	models: number,
	setup: number,
	uncertainty: number,
	readyProm: number,
	algorithm: number,
	pilotModelRequired: string,
): number {
	if (pilotModelRequired === "Не требуется") return 0;
	return roundUp2(base * models * setup * uncertainty * readyProm * algorithm);
}

function calculateStage05(
	base: number,
	models: number,
	setup: number,
	uncertainty: number,
	readyProm: number,
	algorithm: number,
): number {
	return roundUp2(base * models * setup * uncertainty * readyProm * algorithm);
}

function calculateAMLDrafting(
	base: number,
	models: number,
	setup: number,
	uncertainty: number,
	autoMlRequired: string,
): number {
	if (autoMlRequired === "Не требуется") return 0;
	return roundUp2(base * models * setup * uncertainty);
}

function calculateStage05B(
	base: number,
	uncertainty: number,
	readyProm: number,
	pilotSupportRequired: string,
): number {
	if (pilotSupportRequired === "Не требуется") return 0;
	return roundUp2(base * uncertainty * readyProm);
}

function calculateStage07(
	base: number,
	initiatives: number,
	setup: number,
	uncertainty: number,
	prodReports: number,
	productionAdditionalReports: string,
): number {
	if (productionAdditionalReports === "Не требуется") return 0;
	if (initiatives > 0) {
		return roundUp2(
			(base * setup * uncertainty * prodReports) / initiatives,
		);
	}
	return roundUp2(base * setup * uncertainty * prodReports);
}

function calculateStage09(
	base: number,
	models: number,
	setup: number,
	uncertainty: number,
	algorithm: number,
	deployment: number,
	channels: string[],
): number {
	if (channels.length === 0 || channels.includes("Не требуется")) {
		return 0;
	}
	return roundUp2(base * models * setup * uncertainty * algorithm * deployment);
}

function calculateAMLEnforcement(
	base: number,
	models: number,
	setup: number,
	uncertainty: number,
	autoMlRequired: string,
): number {
	if (autoMlRequired === "Не требуется") return 0;
	return roundUp2(base * models * setup * uncertainty);
}

type Coefficients = {
	modelsCountCoefficient: number;
	setupComplexityCoefficient: number;
	generalUncertaintyCoefficient: number;
	readyPromReportsCoefficient: number;
	dataSourcesCountCoefficient: number;
	algorithmComplexityCoefficient: number;
	deploymentChannelsCoefficient: number;
};

function extractCoefficients(data: Record<string, unknown>): Coefficients {
	const generalInfo = readRecord(data.generalInfo);
	const detailInfo = readRecord(data.detailInfo);
	const detailParams =
		readRecord(detailInfo?.model) ?? readRecord(detailInfo?.parameters);
	const uncertainty = readRecord(data.uncertaintyCalculation);
	const ctx = resolveLegacyFormContext(data);

	return {
		modelsCountCoefficient: calculateModelsCoefficient(ctx.modelsCount),
		setupComplexityCoefficient: parseComplexityCoeff(
			typeof generalInfo?.complexity === "string"
				? generalInfo.complexity
				: undefined,
		),
		generalUncertaintyCoefficient: calculateTotalUncertaintyFromRiskGroup(
			readRecord(uncertainty?.riskGroup),
			ctx.uncertaintyAdjustmentPercent,
		),
		readyPromReportsCoefficient: getReadyPromReportsCoefficient(
			ctx.readyPromReports,
		),
		dataSourcesCountCoefficient: calculateDataSourceCoefficient(
			ctx.dataSourcesCount,
		),
		algorithmComplexityCoefficient: Math.max(
			calculateAlgorithmComplexityCoefficient(ctx.algorithmTypes),
			Number(detailParams?.algorithmCoeffValue) || 0,
		) || 1,
		deploymentChannelsCoefficient: calculateDeploymentChannelCoefficient(
			ctx.deploymentChannels,
		),
	};
}

function calculateAllStages(
	data: Record<string, unknown>,
	coefficients: Coefficients,
): Record<V2StageKey, number> {
	const ctx = resolveLegacyFormContext(data);
	const assessedInitiativesCount = ctx.assessedInitiativesCount;

	const c = coefficients;
	const b = V2_STAGE_BASE_VALUES;

	return {
		stage01: calculateStage01(
			b.stage01,
			c.modelsCountCoefficient,
			c.setupComplexityCoefficient,
			c.generalUncertaintyCoefficient,
			c.readyPromReportsCoefficient,
		),
		stage02: calculateStage02(
			b.stage02,
			assessedInitiativesCount,
			c.dataSourcesCountCoefficient,
			c.generalUncertaintyCoefficient,
			ctx.readyPromReports,
			ctx.dataSourcesCount,
		),
		stage04: calculateStage04(
			b.stage04,
			assessedInitiativesCount,
			c.setupComplexityCoefficient,
			c.generalUncertaintyCoefficient,
			ctx.readyPromReports,
			ctx.dataSourcesCount,
		),
		stage05A: calculateStage05A(
			b.stage05A,
			c.modelsCountCoefficient,
			c.setupComplexityCoefficient,
			c.generalUncertaintyCoefficient,
			c.readyPromReportsCoefficient,
			c.algorithmComplexityCoefficient || 1,
			ctx.pilotModelRequired,
		),
		stage05: calculateStage05(
			b.stage05,
			c.modelsCountCoefficient,
			c.setupComplexityCoefficient,
			c.generalUncertaintyCoefficient,
			c.readyPromReportsCoefficient,
			c.algorithmComplexityCoefficient || 1,
		),
		amlDrafting: calculateAMLDrafting(
			b.amlDrafting,
			c.modelsCountCoefficient,
			c.setupComplexityCoefficient,
			c.generalUncertaintyCoefficient,
			ctx.autoMlRequired,
		),
		stage05B: calculateStage05B(
			b.stage05B,
			c.generalUncertaintyCoefficient,
			c.readyPromReportsCoefficient,
			ctx.pilotSupportRequired,
		),
		stage07: calculateStage07(
			b.stage07,
			assessedInitiativesCount,
			c.setupComplexityCoefficient,
			c.generalUncertaintyCoefficient,
			getProductionAdditionalReportsCoefficient(
				ctx.productionAdditionalReports,
			),
			ctx.productionAdditionalReports,
		),
		stage09: calculateStage09(
			b.stage09,
			c.modelsCountCoefficient,
			c.setupComplexityCoefficient,
			c.generalUncertaintyCoefficient,
			c.algorithmComplexityCoefficient || 1,
			c.deploymentChannelsCoefficient || 1,
			ctx.deploymentChannels,
		),
		amlEnforcement: calculateAMLEnforcement(
			b.amlEnforcement,
			c.modelsCountCoefficient,
			c.setupComplexityCoefficient,
			c.generalUncertaintyCoefficient,
			ctx.autoMlRequired,
		),
	};
}

function integrationRowScore(
	base: number,
	coefficients: Coefficients,
	createIS: unknown,
	createService: unknown,
): number {
	const required =
		isPositiveBinaryFormValue(createIS) ||
		isPositiveBinaryFormValue(createService);
	if (!required) return 0;
	return calculateStage01(
		base,
		coefficients.modelsCountCoefficient,
		coefficients.setupComplexityCoefficient,
		coefficients.generalUncertaintyCoefficient,
		coefficients.readyPromReportsCoefficient,
	);
}

function readByDotPath(data: Record<string, unknown>, path: string): unknown {
	return path.split(".").reduce<unknown>((cur, key) => {
		const obj = readRecord(cur);
		return obj ? obj[key] : undefined;
	}, data);
}

function resolveSourceTypicalTasksArray(
	data: Record<string, unknown>,
	sourceTypicalWorksPath?: string | null,
): unknown[] {
	if (sourceTypicalWorksPath) {
		const resolved = readByDotPath(data, sourceTypicalWorksPath);
		if (Array.isArray(resolved)) return resolved;
	}

	const canonical = readArray(
		readRecord(data.streamDataSources)?.sourceTypicalTasks ??
			readRecord(data.detailInfo)?.sourceTypicalTasks,
	);
	if (canonical.length > 0) return canonical;

	const streamBlock = readRecord(data.streamDataSources);
	if (streamBlock) {
		for (const value of Object.values(streamBlock)) {
			if (!Array.isArray(value) || value.length === 0) continue;
			const hasTotals = value.some((row) => {
				const total = Number(readRecord(row)?.total);
				return Number.isFinite(total);
			});
			if (hasTotals) return value;
		}
	}

	return [];
}

/**
 * Расчёт блока «Итоговая оценка» (11 этапов + платформенные стримы) по правилам v1.
 */
export function evaluateLegacyV2Summary(
	data: Record<string, unknown>,
	options?: {
		sourceTypicalWorksPath?: string | null;
		uiSchema?: unknown;
	},
): V2LegacySummaryResult {
	const coefficients = extractCoefficients(data);
	const stages = calculateAllStages(data, coefficients);
	const generalInfo = readRecord(data.generalInfo);
	const mlPlatform = readRecord(data.streamMlPlatform ?? data.mlPlatform);

	const stageKeys = Object.keys(V2_STAGE_BASE_VALUES) as V2StageKey[];
	const detailedCalculation: V2DetailedCalculationRow[] = [];

	let baseTotal = 0;
	let adjustedTotal = 0;

	for (const key of stageKeys) {
		const base = V2_STAGE_BASE_VALUES[key];
		const adjusted = stages[key];
		const hasAdjusted = adjusted > 0;
		baseTotal += base;
		adjustedTotal += adjusted;
		detailedCalculation.push({
			stageName: V2_STAGE_DISPLAY_NAMES[key],
			baseScore: base,
			complexityCoeff: hasAdjusted ? adjusted : null,
			deviationFromBase: hasAdjusted
				? percentDeviation(base, adjusted)
				: null,
			disabled: !hasAdjusted && key !== "stage01" && key !== "stage05",
		});
	}

	const isBase = 33;
	const isAdjusted = integrationRowScore(
		isBase,
		coefficients,
		generalInfo?.createIS,
		generalInfo?.createService,
	);
	baseTotal += isBase;
	adjustedTotal += isAdjusted;

	detailedCalculation.push({
		stageName: "Итого",
		baseScore: roundUp2(baseTotal),
		complexityCoeff: roundUp2(adjustedTotal),
		deviationFromBase: percentDeviation(baseTotal, adjustedTotal),
	});

	detailedCalculation.push({
		stageName: "ИС/Сервисы/Интеграции",
		baseScore: isBase,
		complexityCoeff: isAdjusted > 0 ? isAdjusted : null,
		deviationFromBase:
			isAdjusted > 0 ? percentDeviation(isBase, isAdjusted) : null,
	});

	const atypicalRows = collectAtypicalWorkRowsFromData(data, options?.uiSchema);
	const legacyAtypicalRows = readArray(
		readRecord(data.streamModelControl)?.atypicalTasks ?? data.atypicalTasks,
	);
	const globalAtypical = sumAtypicalIncluded(
		atypicalRows.length > 0 ? atypicalRows : legacyAtypicalRows,
	);
	const atypicalBase = 33;
	const atypicalAdjusted =
		globalAtypical > 0
			? globalAtypical
			: integrationRowScore(atypicalBase, coefficients, "Требуется", undefined);

	detailedCalculation.push({
		stageName: "Нетиповые задачи",
		baseScore: atypicalBase,
		complexityCoeff: atypicalAdjusted > 0 ? atypicalAdjusted : null,
		deviationFromBase:
			atypicalAdjusted > 0
				? percentDeviation(atypicalBase, atypicalAdjusted)
				: null,
	});

	const sourceTypical = sumTaskTotals(
		resolveSourceTypicalTasksArray(
			data,
			options?.sourceTypicalWorksPath ?? V2_SOURCE_TYPICAL_TASKS_OUTPUT_PATH,
		),
	);
	const mlTypical = sumTaskTotals(readArray(mlPlatform?.typicalTasks));
	const mlAtypical = sumAtypicalIncluded(readArray(mlPlatform?.atypicalTasks));
	const algorithmMult = Math.max(coefficients.algorithmComplexityCoefficient, 1);

	const dynamicPlatformStreams =
		options?.uiSchema != null
			? buildExecutorStreamWorkSummaryRows(
					data,
					options.uiSchema,
					algorithmMult,
				).map((row) => ({
					streamName: row.streamName,
					baseTypicalScore: row.baseTypicalScore,
					adjustedTypicalScore: row.adjustedTypicalScore,
					deviationPercent: row.deviationPercent,
					atypicalScore: row.atypicalScore,
				}))
			: null;

	const platformStreams: V2PlatformStreamRow[] = dynamicPlatformStreams?.length
		? dynamicPlatformStreams
		: [
				{
					streamName: V2_PLATFORM_STREAM_NAMES[0],
					baseTypicalScore: mlTypical,
					adjustedTypicalScore: roundUp2(mlTypical * algorithmMult),
					deviationPercent: percentDeviation(mlTypical, mlTypical * algorithmMult),
					atypicalScore: mlAtypical,
				},
				{
					streamName: V2_PLATFORM_STREAM_NAMES[1],
					baseTypicalScore: 0,
					adjustedTypicalScore: 0,
					deviationPercent: null,
					atypicalScore: 0,
				},
				{
					streamName: V2_PLATFORM_STREAM_NAMES[2],
					baseTypicalScore: sourceTypical,
					adjustedTypicalScore: roundUp2(sourceTypical * algorithmMult),
					deviationPercent: percentDeviation(
						sourceTypical,
						sourceTypical * algorithmMult,
					),
					atypicalScore: 0,
				},
			];

	const baseScoreStream = roundUp2(baseTotal);
	const scoreWithComplexityCoeff = roundUp2(adjustedTotal + atypicalAdjusted);

	return {
		baseScoreStream,
		scoreWithComplexityCoeff,
		deviationFromBaseline:
			percentDeviation(baseScoreStream, scoreWithComplexityCoeff) ?? 0,
		detailedCalculation,
		platformStreams,
	};
}

export function buildLegacyStageEvaluationMeta(
	summary: V2LegacySummaryResult,
): V2LegacyStageEvaluationDto {
	return {
		applied: true,
		source: "v1_stages",
		overwrittenPaths: [...V2_LEGACY_STAGE_SUMMARY_POINTERS],
		stageRowCount: summary.detailedCalculation.length,
		platformStreamCount: summary.platformStreams.length,
	};
}

export function applyLegacySummaryToFormData(
	data: Record<string, unknown>,
	options?: {
		sourceTypicalWorksPath?: string | null;
		uiSchema?: unknown;
	},
): { formData: Record<string, unknown>; legacyStageEvaluation: V2LegacyStageEvaluationDto } {
	const summary = evaluateLegacyV2Summary(data, options);
	const next = { ...data };
	const prevSummary = readRecord(next.summary) ?? {};
	next.summary = {
		...prevSummary,
		baseScoreStream: summary.baseScoreStream,
		scoreWithComplexityCoeff: summary.scoreWithComplexityCoeff,
		deviationFromBaseline: summary.deviationFromBaseline,
		detailedCalculation: summary.detailedCalculation,
		platformStreams: summary.platformStreams,
	};
	return {
		formData: next,
		legacyStageEvaluation: buildLegacyStageEvaluationMeta(summary),
	};
}
