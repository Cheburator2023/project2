import type { V2LogicRuleDto } from "./v2-template.types";
import {
	V2_MODEL_STREAM_FACTORY_WORK_IDS,
} from "./v2-model-stream-typical-works.constants";

export const V2_DEVIATION_COEFFICIENTS_CONFIG_RULE_ID =
	"__v2_deviation_coefficients_config__";

export const V2_DEVIATION_COEFFICIENTS_CONFIG_PAYLOAD_ROLE =
	"deviation_coefficients_config" as const;

export type V2DeviationLabelCoefficient = {
	label: string;
	coefficient: number;
};

export type V2DeviationCountStep = {
	count: number;
	coefficient: number;
};

/** Работа, участвующая в колонках отклонений панели итогов. */
export type V2DeviationWorkEntry = {
	workId: string;
	workName: string;
	/** Участвует в расчёте/отображении отклонений. */
	enabled: boolean;
};

/**
 * Редактируемые коэффициенты, раньше захардкоженные в legacy СФЕРА-оценке
 * и используемые для отклонений (база vs поправка).
 */
export type V2DeviationCoefficientsConfig = {
	version: 1;
	/** Прирост коэф. за каждую модель сверх 1 (было 0.75). */
	modelsCountIncrement: number;
	/** Коэф. при «готовые промышленные отчёты = Да» (было 0.5). */
	readyPromYesCoefficient: number;
	/** Прирост за каждый доп. отчёт сверх 1 (было 0.75). */
	productionReportsIncrement: number;
	/** Ступени коэф. по числу источников данных. */
	sourceCountSteps: V2DeviationCountStep[];
	/** Коэф. по типу алгоритма. */
	algorithmTypeCoefficients: V2DeviationLabelCoefficient[];
	/** Коэф. по каналу внедрения. */
	deploymentChannelCoefficients: V2DeviationLabelCoefficient[];
	/** Работы, для которых считаем/показываем отклонения (модельные + любые добавленные). */
	works: V2DeviationWorkEntry[];
};

const DEFAULT_MODEL_WORK_NAMES: Record<string, string> = {
	[V2_MODEL_STREAM_FACTORY_WORK_IDS[0]]: "01. Постановка задачи",
	[V2_MODEL_STREAM_FACTORY_WORK_IDS[1]]: "02. Поиск данных",
	[V2_MODEL_STREAM_FACTORY_WORK_IDS[2]]: "04. Построение витрины для разработки",
	[V2_MODEL_STREAM_FACTORY_WORK_IDS[3]]: "05A. Разработка пилотной модели (MVP)",
	[V2_MODEL_STREAM_FACTORY_WORK_IDS[4]]: "05. Разработка модели",
	[V2_MODEL_STREAM_FACTORY_WORK_IDS[5]]: "AutoML: разработка",
	[V2_MODEL_STREAM_FACTORY_WORK_IDS[6]]: "05B. Пилотирование модели",
	[V2_MODEL_STREAM_FACTORY_WORK_IDS[7]]: "07. Разработка витрины для применения модели",
	[V2_MODEL_STREAM_FACTORY_WORK_IDS[8]]: "09. Адаптация и внедрение модели",
	[V2_MODEL_STREAM_FACTORY_WORK_IDS[9]]: "AutoML: внедрение",
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createDefaultDeviationCoefficientsConfig(): V2DeviationCoefficientsConfig {
	return {
		version: 1,
		modelsCountIncrement: 0.75,
		readyPromYesCoefficient: 0.5,
		productionReportsIncrement: 0.75,
		sourceCountSteps: [
			{ count: 1, coefficient: 1 },
			{ count: 2, coefficient: 1.2 },
			{ count: 3, coefficient: 1.4 },
			{ count: 4, coefficient: 1.6 },
			{ count: 5, coefficient: 1.8 },
			{ count: 6, coefficient: 2 },
			{ count: 7, coefficient: 2.2 },
			{ count: 8, coefficient: 2.4 },
			{ count: 9, coefficient: 2.6 },
			{ count: 10, coefficient: 3 },
		],
		algorithmTypeCoefficients: [
			{ label: "Табличные", coefficient: 0.75 },
			{ label: "Табличные данные", coefficient: 0.75 },
			{ label: "Временные ряды", coefficient: 1 },
			{ label: "NLP", coefficient: 1.25 },
			{ label: "Текстовая аналитика_Классические модели", coefficient: 1.25 },
			{ label: "Текстовая аналитика — Классические модели", coefficient: 1.25 },
			{ label: "Текстовая аналитика_LLM", coefficient: 1.4 },
			{ label: "Текстовая аналитика — LLM", coefficient: 1.4 },
			{ label: "Аудио Аналитика", coefficient: 1.6 },
			{ label: "Аудио аналитика", coefficient: 1.6 },
			{ label: "Аудио-аналитика", coefficient: 1.6 },
			{ label: "Компьютерное зрение_CV", coefficient: 1.8 },
			{ label: "Компьютерное зрение", coefficient: 1.8 },
			{ label: "CV", coefficient: 1.8 },
			{ label: "RL", coefficient: 2.5 },
			{ label: "Оптимизационная задача", coefficient: 2.5 },
			{ label: "Гео-аналитика", coefficient: 3 },
			{ label: "Графовая аналитика", coefficient: 3.5 },
		],
		deploymentChannelCoefficients: [
			{ label: "Батч", coefficient: 0.5 },
			{ label: "Батч+загрузка данных потребителю", coefficient: 0.75 },
			{ label: "Батч + Онлайн", coefficient: 1.2 },
			{ label: "Онлайн", coefficient: 1 },
			{ label: "Онлайн gpu", coefficient: 1.25 },
			{ label: "Стриминг", coefficient: 1.5 },
			{ label: "Мобильные устройства", coefficient: 1.75 },
			{ label: "LLM", coefficient: 2 },
			{ label: "Гео-сервисы", coefficient: 2.25 },
			{ label: "Внедрение в облаке", coefficient: 2.5 },
			{ label: "Графовая платформа", coefficient: 3 },
			{ label: "Требуется", coefficient: 1 },
		],
		works: V2_MODEL_STREAM_FACTORY_WORK_IDS.map((workId) => ({
			workId,
			workName: DEFAULT_MODEL_WORK_NAMES[workId] ?? workId,
			enabled: true,
		})),
	};
}

export function isDeviationCoefficientsConfigLogicRule(
	rule: V2LogicRuleDto,
): boolean {
	if (rule.id === V2_DEVIATION_COEFFICIENTS_CONFIG_RULE_ID) return true;
	const payload = rule.payload;
	return (
		isPlainRecord(payload) &&
		payload.role === V2_DEVIATION_COEFFICIENTS_CONFIG_PAYLOAD_ROLE
	);
}

function asLabelCoefficients(
	value: unknown,
): V2DeviationLabelCoefficient[] | null {
	if (!Array.isArray(value)) return null;
	const out: V2DeviationLabelCoefficient[] = [];
	for (const item of value) {
		if (!isPlainRecord(item)) continue;
		const label = String(item.label ?? "").trim();
		const coefficient = Number(item.coefficient);
		if (!label || !Number.isFinite(coefficient)) continue;
		out.push({ label, coefficient });
	}
	return out.length > 0 ? out : null;
}

function asCountSteps(value: unknown): V2DeviationCountStep[] | null {
	if (!Array.isArray(value)) return null;
	const out: V2DeviationCountStep[] = [];
	for (const item of value) {
		if (!isPlainRecord(item)) continue;
		const count = Number(item.count);
		const coefficient = Number(item.coefficient);
		if (!Number.isFinite(count) || !Number.isFinite(coefficient)) continue;
		out.push({ count, coefficient });
	}
	return out.length > 0 ? out : null;
}

function asWorks(value: unknown): V2DeviationWorkEntry[] | null {
	if (!Array.isArray(value)) return null;
	const out: V2DeviationWorkEntry[] = [];
	for (const item of value) {
		if (!isPlainRecord(item)) continue;
		const workId = String(item.workId ?? "").trim();
		if (!workId) continue;
		out.push({
			workId,
			workName:
				String(item.workName ?? "").trim() ||
				DEFAULT_MODEL_WORK_NAMES[workId] ||
				workId,
			enabled: item.enabled !== false,
		});
	}
	return out.length > 0 ? out : null;
}

export function parseDeviationCoefficientsConfigFromLogic(
	rules: readonly V2LogicRuleDto[] | undefined,
): V2DeviationCoefficientsConfig {
	const defaults = createDefaultDeviationCoefficientsConfig();
	const rule = (rules ?? []).find(isDeviationCoefficientsConfigLogicRule);
	const payload = rule?.payload;
	if (!isPlainRecord(payload)) return defaults;
	const src = isPlainRecord(payload.config) ? payload.config : payload;

	const modelsCountIncrement = Number(src.modelsCountIncrement);
	const readyPromYesCoefficient = Number(src.readyPromYesCoefficient);
	const productionReportsIncrement = Number(src.productionReportsIncrement);

	return {
		version: 1,
		modelsCountIncrement: Number.isFinite(modelsCountIncrement)
			? modelsCountIncrement
			: defaults.modelsCountIncrement,
		readyPromYesCoefficient: Number.isFinite(readyPromYesCoefficient)
			? readyPromYesCoefficient
			: defaults.readyPromYesCoefficient,
		productionReportsIncrement: Number.isFinite(productionReportsIncrement)
			? productionReportsIncrement
			: defaults.productionReportsIncrement,
		sourceCountSteps:
			asCountSteps(src.sourceCountSteps) ?? defaults.sourceCountSteps,
		algorithmTypeCoefficients:
			asLabelCoefficients(src.algorithmTypeCoefficients) ??
			defaults.algorithmTypeCoefficients,
		deploymentChannelCoefficients:
			asLabelCoefficients(src.deploymentChannelCoefficients) ??
			defaults.deploymentChannelCoefficients,
		works: asWorks(src.works) ?? defaults.works,
	};
}

export function buildDeviationCoefficientsConfigLogicRule(
	config: V2DeviationCoefficientsConfig,
): V2LogicRuleDto {
	return {
		id: V2_DEVIATION_COEFFICIENTS_CONFIG_RULE_ID,
		kind: "computed",
		targetPath: "/summary",
		dependencies: [],
		condition: true,
		description:
			"Коэффициенты отклонений СФЕРА / панель итогов (модели, источники, алгоритмы, каналы, список работ).",
		payload: {
			role: V2_DEVIATION_COEFFICIENTS_CONFIG_PAYLOAD_ROLE,
			version: 1,
			config: { ...config, version: 1 },
		},
	};
}

export function mergeDeviationCoefficientsConfigIntoLogic(
	rules: V2LogicRuleDto[],
	config: V2DeviationCoefficientsConfig,
): V2LogicRuleDto[] {
	const preserved = rules.filter((r) => !isDeviationCoefficientsConfigLogicRule(r));
	return [...preserved, buildDeviationCoefficientsConfigLogicRule(config)];
}

export function resolveSourceCountCoefficient(
	config: V2DeviationCoefficientsConfig,
	dataSourceCount: number,
): number {
	if (dataSourceCount <= 0) return 1;
	const exact = config.sourceCountSteps.find((s) => s.count === dataSourceCount);
	if (exact) return exact.coefficient;
	const sorted = [...config.sourceCountSteps].sort((a, b) => a.count - b.count);
	let fallback = 1;
	for (const step of sorted) {
		if (step.count <= dataSourceCount) fallback = step.coefficient;
	}
	return fallback;
}

export function resolveAlgorithmTypeCoefficient(
	config: V2DeviationCoefficientsConfig,
	algorithmTypes: string[],
): number {
	const map = Object.fromEntries(
		config.algorithmTypeCoefficients.map((row) => [row.label, row.coefficient]),
	);
	return algorithmTypes.reduce((total, type) => {
		if (!type || !(type in map)) return total;
		return total + (map[type] ?? 0);
	}, 0);
}

export function resolveDeploymentChannelCoefficient(
	config: V2DeviationCoefficientsConfig,
	channels: string[],
): number {
	const map = Object.fromEntries(
		config.deploymentChannelCoefficients.map((row) => [
			row.label,
			row.coefficient,
		]),
	);
	return channels.reduce((total, channel) => total + (map[channel] ?? 0), 0);
}
