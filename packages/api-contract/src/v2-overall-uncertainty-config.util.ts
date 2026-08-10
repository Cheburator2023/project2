import {
	INFLUENCE_VALUES,
	INITIATIVE_COST_VALUES,
	INITIATIVE_TIMELINE_VALUES,
	PROBABILITY_VALUES,
} from "./calculation.constants";
import type { V2LogicRuleDto } from "./v2-template.types";
import {
	V2_UNCERTAINTY_RISK_GROUP_LABELS,
	V2_UNCERTAINTY_RISK_GROUP_ORDER,
} from "./v2-questionnaire-registry-columns.util";

export const V2_OVERALL_UNCERTAINTY_CONFIG_RULE_ID =
	"v2-overall-uncertainty-config";

export const V2_OVERALL_UNCERTAINTY_CONFIG_PAYLOAD_ROLE =
	"overall_uncertainty_config" as const;

/** Уровень серьёзности: три формулировки для вопросов анкеты. */
export type V2UncertaintySeverityLevel = {
	id: string;
	/** Подпись в п.3.1 Сроки. */
	timelineLabel: string;
	/** Подпись в п.3.2 Стоимость. */
	costLabel: string;
	/** Подпись «Влияние на Цели» в п.3.4. */
	goalsLabel: string;
};

export type V2UncertaintyProbabilityLevel = {
	id: string;
	label: string;
};

/** Группа риска: коэффициент, прибавляемый к базе (напр. 0.10). */
export type V2UncertaintyRiskGroup = {
	id: string;
	name: string;
	coef: number;
	/** Цвет-метка группы в матрице и легенде (hex). */
	color?: string;
};

/** Свёртка коэффициентов отмеченных рисков: сумма (базовый вариант) или среднее. */
export type V2UncertaintyAggregationMode = "sum" | "avg";

/** Настройки поля «Поправка, %»: границы, дефолт и подсказка пользователю. */
export type V2UncertaintyAdjustmentSettings = {
	minPct: number;
	maxPct: number;
	defaultPct: number;
	hint: string;
};

export const V2_UNCERTAINTY_ADJUSTMENT_DEFAULTS: V2UncertaintyAdjustmentSettings =
	{
		minPct: 0,
		maxPct: 30,
		defaultPct: 0,
		hint: "Экспертная надбавка, добавляется к агрегату по рискам",
	};

/** Вероятность «Не применимо»: риск отмечен, но в расчёт вносит ноль. */
export function isUncertaintyNotApplicableLabel(label: string): boolean {
	return label.trim().toLowerCase().replace(/ё/g, "е") === "не применимо";
}

/** Диапазон «за количество отмеченных рисков». */
export type V2UncertaintyRiskCountRange = {
	minCount: number;
	/** null = без верхней границы (N+). */
	maxCount: number | null;
	coef: number;
};

export type V2UncertaintyRiskCatalogItem = {
	id: string;
	name: string;
};

/**
 * Конфигурация модуля «Общая неопределённость» (Опросник СА, п.3).
 * `matrix[severityIdx][probabilityIdx] = groupId`.
 */
export type V2OverallUncertaintyConfig = {
	version: 2;
	severityLevels: V2UncertaintySeverityLevel[];
	probabilityLevels: V2UncertaintyProbabilityLevel[];
	groups: V2UncertaintyRiskGroup[];
	/** @deprecated не участвует в методике; хранится для обратной совместимости. */
	riskCountRanges: V2UncertaintyRiskCountRange[];
	/** Свёртка коэффициентов рисков: сумма (базовый вариант) или среднее. */
	aggregation: V2UncertaintyAggregationMode;
	/** Границы/дефолт/подсказка поля «Поправка, %». */
	adjustment: V2UncertaintyAdjustmentSettings;
	/** Строки = серьёзность (низ→выс), столбцы = вероятность (низ→выс). */
	matrix: string[][];
	risks: V2UncertaintyRiskCatalogItem[];
	/**
	 * Дефолты правой панели (то, что видит/заполняет пользователь анкеты):
	 * тоггл «Заполняется» / «Не применимо», сроки, стоимость, отмеченные риски, поправка.
	 * Версия шаблона не хранит formData — поэтому состояние лежит здесь, в logic-config.
	 */
	calculator?: V2OverallUncertaintyPreviewState;
};

export type V2OverallUncertaintyPreviewState = {
	/** false = «Не применимо», поправка 0, коэфф. = 1. */
	enabled: boolean;
	/**
	 * Оба поля базы (срок + стоимость) выбраны.
	 * false → итог «не рассчитан» (coef 1), ответы по рискам могут остаться в formData.
	 * В калькуляторе конструктора по умолчанию true (индексы заданы явно).
	 */
	baseComplete?: boolean;
	timelineIdx: number;
	costIdx: number;
	/** Ручная поправка 0–30%; null = не задана (считаем по рискам). */
	adjPct: number | null;
	risks: Array<{
		id: string;
		enabled: boolean;
		probIdx: number;
		/** Индекс влияния на Цели (= severity level). */
		goalsIdx: number;
	}>;
};

export type V2OverallUncertaintyRiskContribution = {
	id: string;
	name: string;
	severityIdx: number;
	severityLabel: string;
	probIdx: number;
	probLabel: string;
	groupId: string;
	groupName: string;
	coef: number;
};

export type V2OverallUncertaintyCalcBreakdown = {
	applicable: boolean;
	timelineLabel: string;
	costLabel: string;
	baseSeverityIdx: number;
	baseSeverityLabel: string;
	/** Введённая пользователем поправка (%), null = не задана (берётся дефолт). */
	manualAdjPct: number | null;
	enabledRiskCount: number;
	riskContributions: V2OverallUncertaintyRiskContribution[];
	/** Режим свёртки, применённый к рискам. */
	aggregation: V2UncertaintyAggregationMode;
	/** Агрегат по рискам: сумма или среднее коэффициентов. */
	riskAggregate: number;
	/** Доля поправки = поправка% / 100. */
	adjustmentShare: number;
	/** Итоговый коэффициент = 1 + агрегат + поправка/100. */
	coefficient: number;
	/** Построчный предпросмотр формулы. */
	formulaLines: string[];
};

function newId(prefix: string): string {
	return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_GROUP_IDS = {
	notApplicable: "grp_not_applicable",
	low: "grp_low",
	medium: "grp_medium",
	high: "grp_high",
	veryHigh: "grp_very_high",
} as const;

export const V2_UNCERTAINTY_GROUP_DEFAULT_COLORS: Record<string, string> = {
	[DEFAULT_GROUP_IDS.veryHigh]: "#d95757",
	[DEFAULT_GROUP_IDS.high]: "#ef8a3c",
	[DEFAULT_GROUP_IDS.medium]: "#e3ba33",
	[DEFAULT_GROUP_IDS.low]: "#57a662",
	[DEFAULT_GROUP_IDS.notApplicable]: "#9aa4b2",
};

/**
 * Матрица методики СА (как в v1 generalUncertaintyCoefficient):
 * строки — серьёзность низ→выс, столбцы — вероятность низ→выс.
 */
function buildSaMethodologyMatrix(ids: {
	low: string;
	medium: string;
	high: string;
	veryHigh: string;
}): string[][] {
	const { low: L, medium: M, high: H, veryHigh: VH } = ids;
	return [
		// Низкая
		[L, L, L, M, M],
		// Средняя
		[L, L, M, H, H],
		// Существенная
		[L, M, H, H, VH],
		// Высокая
		[M, M, H, VH, VH],
		// Неприемлемая
		[M, H, VH, VH, VH],
	];
}

/** Группа-«ноль» для столбца «Не применимо»: coef 0, иначе минимальный coef. */
function pickZeroGroupId(groups: readonly V2UncertaintyRiskGroup[]): string {
	const zero = groups.find((g) => g.coef === 0);
	if (zero) return zero.id;
	const sorted = [...groups].sort((a, b) => a.coef - b.coef);
	return sorted[0]?.id ?? "";
}

/**
 * Дефолтная матрица при произвольном размере шкал (после add/remove).
 * Столбцы «Не применимо» всегда получают группу с коэффициентом 0.
 */
function buildDefaultMatrix(
	severityCount: number,
	probabilityLevels: readonly V2UncertaintyProbabilityLevel[],
	groups: readonly V2UncertaintyRiskGroup[],
): string[][] {
	const zeroId = pickZeroGroupId(groups);
	const ranked = [...groups]
		.filter((g) => g.coef > 0)
		.sort((a, b) => a.coef - b.coef);
	const fallback = ranked[0]?.id ?? groups[0]?.id ?? "";
	const byRank = [
		ranked[0]?.id ?? fallback,
		ranked[1]?.id ?? ranked[0]?.id ?? fallback,
		ranked[2]?.id ?? ranked[ranked.length - 1]?.id ?? fallback,
		ranked[3]?.id ?? ranked[ranked.length - 1]?.id ?? fallback,
	];

	const naFlags = probabilityLevels.map((p) =>
		isUncertaintyNotApplicableLabel(p.label),
	);
	const effectiveCols = naFlags.filter((na) => !na).length;

	const saRows =
		severityCount === 5 && effectiveCols === 5
			? buildSaMethodologyMatrix({
					low: byRank[0]!,
					medium: byRank[1]!,
					high: byRank[2]!,
					veryHigh: byRank[3]!,
				})
			: null;

	const pick = (sev: number, effProb: number): string => {
		if (saRows) return saRows[sev]?.[effProb] ?? fallback;
		const score =
			severityCount <= 1 || effectiveCols <= 1
				? 0
				: sev / (severityCount - 1) + effProb / (effectiveCols - 1);
		if (score < 0.5) return byRank[0]!;
		if (score < 1.0) return byRank[1]!;
		if (score < 1.5) return byRank[2]!;
		return byRank[3]!;
	};

	return Array.from({ length: severityCount }, (_, sev) => {
		let effProb = 0;
		return probabilityLevels.map((_, probIdx) => {
			if (naFlags[probIdx]) return zeroId;
			return pick(sev, effProb++);
		});
	});
}

export function createDefaultOverallUncertaintyConfig(): V2OverallUncertaintyConfig {
	const groups: V2UncertaintyRiskGroup[] = [
		{
			id: DEFAULT_GROUP_IDS.veryHigh,
			name: "Очень высокий",
			coef: 0.1,
			color: V2_UNCERTAINTY_GROUP_DEFAULT_COLORS[DEFAULT_GROUP_IDS.veryHigh],
		},
		{
			id: DEFAULT_GROUP_IDS.high,
			name: "Высокий",
			coef: 0.07,
			color: V2_UNCERTAINTY_GROUP_DEFAULT_COLORS[DEFAULT_GROUP_IDS.high],
		},
		{
			id: DEFAULT_GROUP_IDS.medium,
			name: "Средний",
			coef: 0.05,
			color: V2_UNCERTAINTY_GROUP_DEFAULT_COLORS[DEFAULT_GROUP_IDS.medium],
		},
		{
			id: DEFAULT_GROUP_IDS.low,
			name: "Низкий",
			coef: 0.03,
			color: V2_UNCERTAINTY_GROUP_DEFAULT_COLORS[DEFAULT_GROUP_IDS.low],
		},
		{
			id: DEFAULT_GROUP_IDS.notApplicable,
			name: "Не применимо",
			coef: 0,
			color:
				V2_UNCERTAINTY_GROUP_DEFAULT_COLORS[DEFAULT_GROUP_IDS.notApplicable],
		},
	];

	const severityLevels: V2UncertaintySeverityLevel[] =
		INITIATIVE_TIMELINE_VALUES.map((timelineLabel, i) => ({
			id: `sev_${i + 1}`,
			timelineLabel,
			costLabel: INITIATIVE_COST_VALUES[i] ?? timelineLabel,
			goalsLabel: INFLUENCE_VALUES[i] ?? timelineLabel,
		}));

	// Уровень 0 — «Не применимо»: риск отмечен, но в расчёт вносит ноль.
	const probabilityLevels: V2UncertaintyProbabilityLevel[] = [
		{ id: "prob_0", label: "Не применимо" },
		...PROBABILITY_VALUES.map((label, i) => ({
			id: `prob_${i + 1}`,
			label,
		})),
	];

	const base: V2OverallUncertaintyConfig = {
		version: 2,
		severityLevels,
		probabilityLevels,
		groups,
		riskCountRanges: [],
		aggregation: "sum",
		adjustment: { ...V2_UNCERTAINTY_ADJUSTMENT_DEFAULTS },
		matrix: buildDefaultMatrix(severityLevels.length, probabilityLevels, groups),
		risks: V2_UNCERTAINTY_RISK_GROUP_ORDER.map((key) => ({
			id: key,
			name: V2_UNCERTAINTY_RISK_GROUP_LABELS[key] ?? key,
		})),
	};
	return withNormalizedOverallUncertaintyCalculator(base);
}

export function createDefaultOverallUncertaintyPreviewState(
	config: V2OverallUncertaintyConfig,
): V2OverallUncertaintyPreviewState {
	return {
		enabled: false,
		baseComplete: true,
		timelineIdx: 0,
		costIdx: 0,
		adjPct: null,
		risks: config.risks.map((r) => ({
			id: r.id,
			enabled: false,
			probIdx: 0,
			goalsIdx: 0,
		})),
	};
}

function clampIdx(idx: number, len: number): number {
	if (len <= 0) return 0;
	if (!Number.isFinite(idx)) return 0;
	return Math.max(0, Math.min(len - 1, Math.trunc(idx)));
}

/**
 * Подгоняет состояние калькулятора под актуальные шкалы/каталог рисков
 * (индексы, id рисков, adjPct).
 */
export function normalizeOverallUncertaintyCalculatorState(
	config: V2OverallUncertaintyConfig,
	calculator?: V2OverallUncertaintyPreviewState | null,
): V2OverallUncertaintyPreviewState {
	const defaults = createDefaultOverallUncertaintyPreviewState(config);
	if (!calculator) return defaults;

	const prevById = new Map(
		(Array.isArray(calculator.risks) ? calculator.risks : []).map((risk) => [
			risk.id,
			risk,
		]),
	);
	const adjRaw = calculator.adjPct;
	const adjNum = adjRaw == null ? Number.NaN : Number(adjRaw);
	const adjPct = Number.isFinite(adjNum)
		? clampUncertaintyAdjustmentPct(adjNum, config.adjustment)
		: null;

	return {
		enabled: Boolean(calculator.enabled),
		baseComplete: calculator.baseComplete !== false,
		timelineIdx: clampIdx(
			Number(calculator.timelineIdx),
			config.severityLevels.length,
		),
		costIdx: clampIdx(Number(calculator.costIdx), config.severityLevels.length),
		adjPct,
		risks: config.risks.map((risk) => {
			const prev = prevById.get(risk.id);
			return {
				id: risk.id,
				enabled: Boolean(prev?.enabled),
				probIdx: clampIdx(
					Number(prev?.probIdx ?? 0),
					config.probabilityLevels.length,
				),
				goalsIdx: clampIdx(
					Number(prev?.goalsIdx ?? 0),
					config.severityLevels.length,
				),
			};
		}),
	};
}

/** Вшивает нормализованный calculator в конфиг (после parse / resize / правок шкал). */
export function withNormalizedOverallUncertaintyCalculator(
	config: V2OverallUncertaintyConfig,
	calculator?: V2OverallUncertaintyPreviewState | null,
): V2OverallUncertaintyConfig {
	return {
		...config,
		calculator: normalizeOverallUncertaintyCalculatorState(
			config,
			calculator ?? config.calculator,
		),
	};
}

function round4(n: number): number {
	return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

/** Обрезает поправку (%) до границ, заданных конфигуратором. */
export function clampUncertaintyAdjustmentPct(
	pct: number,
	settings: V2UncertaintyAdjustmentSettings,
): number {
	const min = Number.isFinite(settings.minPct) ? settings.minPct : 0;
	const max = Number.isFinite(settings.maxPct) ? settings.maxPct : 30;
	return Math.min(max, Math.max(min, pct));
}

function formatCoef(n: number): string {
	return String(round4(n)).replace(".", ",");
}

export function resolveUncertaintyRiskCountCoef(
	count: number,
	ranges: readonly V2UncertaintyRiskCountRange[],
): number {
	if (count <= 0 || ranges.length === 0) return 1;
	const sorted = [...ranges].sort((a, b) => a.minCount - b.minCount);
	for (const range of sorted) {
		const max = range.maxCount;
		if (count >= range.minCount && (max == null || count <= max)) {
			return range.coef;
		}
	}
	return 1;
}

function groupById(
	config: V2OverallUncertaintyConfig,
	groupId: string,
): V2UncertaintyRiskGroup | undefined {
	return config.groups.find((g) => g.id === groupId);
}

function lookupMatrixGroupId(
	config: V2OverallUncertaintyConfig,
	severityIdx: number,
	probIdx: number,
): string {
	const row = config.matrix[severityIdx];
	const id = row?.[probIdx];
	if (typeof id === "string" && id) return id;
	return config.groups[0]?.id ?? "";
}

/**
 * Коэффициент общей неопределённости по методике конфигуратора:
 * 1. база = худший из двух — Сроки и Стоимость (max индексов);
 * 2. уровень риска = худший из трёх — база и «влияние на Цели» (max);
 * 3. уровень × вероятность → ячейка матрицы → группа → коэффициент
 *    (вероятность «Не применимо» всегда даёт 0);
 * 4. агрегат = сумма (базовый вариант) или среднее коэффициентов;
 * 5. итог = 1 + агрегат + поправка/100 (поправка добавляется, не перекрывает).
 */
export function calculateOverallUncertaintyPreview(
	config: V2OverallUncertaintyConfig,
	preview: V2OverallUncertaintyPreviewState,
): V2OverallUncertaintyCalcBreakdown {
	const formulaLines: string[] = [];

	if (!preview.enabled) {
		return {
			applicable: false,
			timelineLabel: "—",
			costLabel: "—",
			baseSeverityIdx: 0,
			baseSeverityLabel: "Не применимо",
			manualAdjPct: null,
			enabledRiskCount: 0,
			riskContributions: [],
			aggregation: config.aggregation,
			riskAggregate: 0,
			adjustmentShare: 0,
			coefficient: 1,
			formulaLines: ["Раздел выключен («Не применимо») → коэффициент 1"],
		};
	}

	if (preview.baseComplete === false) {
		return {
			applicable: true,
			timelineLabel: "—",
			costLabel: "—",
			baseSeverityIdx: 0,
			baseSeverityLabel: "Не рассчитано",
			manualAdjPct: null,
			enabledRiskCount: 0,
			riskContributions: [],
			aggregation: config.aggregation,
			riskAggregate: 0,
			adjustmentShare: 0,
			coefficient: 1,
			formulaLines: [
				"Срок или стоимость инициативы не выбраны → коэффициент 1 (не рассчитано)",
			],
		};
	}

	const tlIdx = clampIdx(preview.timelineIdx, config.severityLevels.length);
	const costIdx = clampIdx(preview.costIdx, config.severityLevels.length);
	const tl = config.severityLevels[tlIdx];
	const cost = config.severityLevels[costIdx];
	const baseSeverityIdx = Math.max(tlIdx, costIdx);
	const baseLevel = config.severityLevels[baseSeverityIdx];
	const baseSeverityLabel =
		baseLevel?.timelineLabel ?? `уровень ${baseSeverityIdx + 1}`;

	formulaLines.push(
		`Базовый уровень = max(Сроки «${tl?.timelineLabel ?? "—"}», Стоимость «${cost?.costLabel ?? "—"}») → «${baseSeverityLabel}»`,
	);

	const catalogById = new Map(config.risks.map((r) => [r.id, r]));
	const enabled = preview.risks.filter((r) => r.enabled);
	const riskContributions: V2OverallUncertaintyRiskContribution[] = enabled.map(
		(r) => {
			const name = catalogById.get(r.id)?.name ?? r.id;
			const goalsIdx = clampIdx(r.goalsIdx, config.severityLevels.length);
			const probIdx = clampIdx(r.probIdx, config.probabilityLevels.length);
			const severityIdx = Math.max(baseSeverityIdx, goalsIdx);
			const goalsSelectedLabel =
				config.severityLevels[goalsIdx]?.goalsLabel ??
				`уровень ${goalsIdx + 1}`;
			const severityLabel =
				config.severityLevels[severityIdx]?.timelineLabel ??
				`уровень ${severityIdx + 1}`;
			const probLabel =
				config.probabilityLevels[probIdx]?.label ?? `вер. ${probIdx + 1}`;
			const probNotApplicable = isUncertaintyNotApplicableLabel(probLabel);
			const groupId = lookupMatrixGroupId(config, severityIdx, probIdx);
			const group = groupById(config, groupId);
			return {
				id: r.id,
				name,
				severityIdx,
				severityLabel: `${severityLabel} (цели: ${goalsSelectedLabel})`,
				probIdx,
				probLabel,
				groupId,
				groupName: probNotApplicable
					? "Не применимо"
					: (group?.name ?? groupId),
				// «Не применимо» всегда вносит ноль, независимо от матрицы.
				coef: probNotApplicable ? 0 : (group?.coef ?? 0),
			};
		},
	);

	for (const c of riskContributions) {
		formulaLines.push(
			`Риск «${c.name}»: max(база, влияние) → «${c.severityLabel}» × вер. «${c.probLabel}» → «${c.groupName}» = ${formatCoef(c.coef)}`,
		);
	}

	const riskSum = round4(
		riskContributions.reduce((sum, c) => sum + c.coef, 0),
	);
	const riskAggregate =
		config.aggregation === "avg" && riskContributions.length > 0
			? round4(riskSum / riskContributions.length)
			: riskSum;

	if (riskContributions.length > 0) {
		const parts = riskContributions.map((c) => formatCoef(c.coef)).join(" + ");
		formulaLines.push(
			config.aggregation === "avg"
				? `Среднее по ${riskContributions.length} рискам = (${parts}) ÷ ${riskContributions.length} = ${formatCoef(riskAggregate)}`
				: `Сумма по ${riskContributions.length} рискам = ${parts} = ${formatCoef(riskAggregate)}`,
		);
	} else {
		formulaLines.push("Отмеченных рисков нет → агрегат по рискам 0");
	}

	const manualRaw = preview.adjPct;
	const manualAdjPct =
		manualRaw == null || !Number.isFinite(manualRaw)
			? null
			: clampUncertaintyAdjustmentPct(manualRaw, config.adjustment);
	const effectivePct =
		manualAdjPct ??
		clampUncertaintyAdjustmentPct(
			Number.isFinite(config.adjustment.defaultPct)
				? config.adjustment.defaultPct
				: 0,
			config.adjustment,
		);
	const adjustmentShare = round4(effectivePct / 100);

	formulaLines.push(
		`Поправка = ${String(effectivePct).replace(".", ",")}% → ${formatCoef(adjustmentShare)}`,
	);

	const coefficient = round2(1 + riskAggregate + adjustmentShare);
	formulaLines.push(
		`Общая неопределённость = 1 + ${formatCoef(riskAggregate)} + ${formatCoef(adjustmentShare)} = ${String(coefficient).replace(".", ",")}`,
	);

	return {
		applicable: true,
		timelineLabel: tl?.timelineLabel ?? "—",
		costLabel: cost?.costLabel ?? "—",
		baseSeverityIdx,
		baseSeverityLabel,
		manualAdjPct,
		enabledRiskCount: enabled.length,
		riskContributions,
		aggregation: config.aggregation,
		riskAggregate,
		adjustmentShare,
		coefficient,
		formulaLines,
	};
}

/** Подгоняет матрицу под размеры шкал при add/remove. */
export function resizeUncertaintyMatrix(
	config: V2OverallUncertaintyConfig,
): V2OverallUncertaintyConfig {
	const rows = config.severityLevels.length;
	const cols = config.probabilityLevels.length;
	const fallback = config.groups[0]?.id ?? "";
	const next = Array.from({ length: rows }, (_, sev) =>
		Array.from({ length: cols }, (_, prob) => {
			const existing = config.matrix[sev]?.[prob];
			if (
				typeof existing === "string" &&
				config.groups.some((g) => g.id === existing)
			) {
				return existing;
			}
			return (
				buildDefaultMatrix(rows, config.probabilityLevels, config.groups)[
					sev
				]?.[prob] ?? fallback
			);
		}),
	);
	return withNormalizedOverallUncertaintyCalculator({ ...config, matrix: next });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asSeverityLevels(
	value: unknown,
): V2UncertaintySeverityLevel[] | null {
	if (!Array.isArray(value)) return null;
	const out: V2UncertaintySeverityLevel[] = [];
	for (const item of value) {
		if (!isPlainRecord(item)) continue;
		const id = String(item.id ?? "").trim() || newId("sev");
		const timelineLabel = String(item.timelineLabel ?? "").trim();
		const costLabel = String(item.costLabel ?? "").trim();
		const goalsLabel = String(item.goalsLabel ?? "").trim();
		if (!timelineLabel && !costLabel && !goalsLabel) continue;
		out.push({
			id,
			timelineLabel: timelineLabel || goalsLabel || costLabel,
			costLabel: costLabel || timelineLabel || goalsLabel,
			goalsLabel: goalsLabel || timelineLabel || costLabel,
		});
	}
	return out.length > 0 ? out : null;
}

function asProbabilityLevels(
	value: unknown,
): V2UncertaintyProbabilityLevel[] | null {
	if (!Array.isArray(value)) return null;
	const out: V2UncertaintyProbabilityLevel[] = [];
	for (const item of value) {
		if (!isPlainRecord(item)) continue;
		const label = String(item.label ?? "").trim();
		if (!label) continue;
		out.push({
			id: String(item.id ?? "").trim() || newId("prob"),
			label,
		});
	}
	return out.length > 0 ? out : null;
}

function asGroups(value: unknown): V2UncertaintyRiskGroup[] | null {
	if (!Array.isArray(value)) return null;
	const out: V2UncertaintyRiskGroup[] = [];
	for (const item of value) {
		if (!isPlainRecord(item)) continue;
		const name = String(item.name ?? "").trim();
		const coef = Number(item.coef);
		if (!name || !Number.isFinite(coef)) continue;
		const id = String(item.id ?? "").trim() || newId("grp");
		const color = String(item.color ?? "").trim();
		out.push({
			id,
			name,
			coef,
			color: color || V2_UNCERTAINTY_GROUP_DEFAULT_COLORS[id],
		});
	}
	return out.length > 0 ? out : null;
}

function asAggregation(value: unknown): V2UncertaintyAggregationMode {
	return value === "avg" ? "avg" : "sum";
}

function asAdjustmentSettings(value: unknown): V2UncertaintyAdjustmentSettings {
	const defaults = { ...V2_UNCERTAINTY_ADJUSTMENT_DEFAULTS };
	if (!isPlainRecord(value)) return defaults;
	const minPct = Number(value.minPct);
	const maxPct = Number(value.maxPct);
	const defaultPct = Number(value.defaultPct);
	const hint = typeof value.hint === "string" ? value.hint : defaults.hint;
	const min = Number.isFinite(minPct) ? Math.max(0, minPct) : defaults.minPct;
	const max = Number.isFinite(maxPct) ? Math.max(min, maxPct) : defaults.maxPct;
	return {
		minPct: min,
		maxPct: max,
		defaultPct: Number.isFinite(defaultPct)
			? Math.min(max, Math.max(min, defaultPct))
			: defaults.defaultPct,
		hint,
	};
}

function asCountRanges(value: unknown): V2UncertaintyRiskCountRange[] | null {
	if (!Array.isArray(value)) return null;
	const out: V2UncertaintyRiskCountRange[] = [];
	for (const item of value) {
		if (!isPlainRecord(item)) continue;
		const minCount = Number(item.minCount);
		const coef = Number(item.coef);
		if (!Number.isFinite(minCount) || !Number.isFinite(coef)) continue;
		const maxRaw = item.maxCount;
		const maxCount =
			maxRaw == null || maxRaw === ""
				? null
				: Number.isFinite(Number(maxRaw))
					? Number(maxRaw)
					: null;
		out.push({ minCount, maxCount, coef });
	}
	return out;
}

function asRisks(value: unknown): V2UncertaintyRiskCatalogItem[] | null {
	if (!Array.isArray(value)) return null;
	const out: V2UncertaintyRiskCatalogItem[] = [];
	for (const item of value) {
		if (!isPlainRecord(item)) continue;
		const id = String(item.id ?? "").trim();
		const name = String(item.name ?? "").trim();
		if (!id || !name) continue;
		out.push({ id, name });
	}
	return out.length > 0 ? out : null;
}

function asCalculator(
	value: unknown,
): V2OverallUncertaintyPreviewState | null {
	if (!isPlainRecord(value)) return null;
	const risksRaw = Array.isArray(value.risks) ? value.risks : [];
	const risks = risksRaw
		.filter(isPlainRecord)
		.map((risk) => ({
			id: String(risk.id ?? "").trim(),
			enabled: Boolean(risk.enabled),
			probIdx: Number(risk.probIdx) || 0,
			goalsIdx: Number(risk.goalsIdx) || 0,
		}))
		.filter((risk) => risk.id);
	const adjRaw = value.adjPct;
	const adjPct =
		adjRaw == null || adjRaw === ""
			? null
			: Number.isFinite(Number(adjRaw))
				? Number(adjRaw)
				: null;
	return {
		enabled: Boolean(value.enabled),
		baseComplete: value.baseComplete !== false,
		timelineIdx: Number(value.timelineIdx) || 0,
		costIdx: Number(value.costIdx) || 0,
		adjPct,
		risks,
	};
}

function asMatrix(
	value: unknown,
	rows: number,
	cols: number,
	fallbackGroupId: string,
): string[][] | null {
	if (!Array.isArray(value)) return null;
	const out: string[][] = [];
	for (let r = 0; r < rows; r++) {
		const rowRaw = value[r];
		const row: string[] = [];
		for (let c = 0; c < cols; c++) {
			const cell = Array.isArray(rowRaw) ? rowRaw[c] : undefined;
			row.push(typeof cell === "string" && cell ? cell : fallbackGroupId);
		}
		out.push(row);
	}
	return out;
}

/** Миграция legacy v1 (tiers/timelineOpts/…) → v2. */
function migrateV1Config(src: Record<string, unknown>): V2OverallUncertaintyConfig {
	const defaults = createDefaultOverallUncertaintyConfig();
	const tiers = Array.isArray(src.tiers) ? src.tiers : [];
	const timelineOpts = Array.isArray(src.timelineOpts) ? src.timelineOpts : [];
	const costOpts = Array.isArray(src.costOpts) ? src.costOpts : [];
	const len = Math.max(
		tiers.length,
		timelineOpts.length,
		costOpts.length,
		defaults.severityLevels.length,
	);

	const severityLevels: V2UncertaintySeverityLevel[] = [];
	for (let i = 0; i < len; i++) {
		const tier = isPlainRecord(tiers[i]) ? tiers[i] : null;
		const tl = isPlainRecord(timelineOpts[i]) ? timelineOpts[i] : null;
		const cost = isPlainRecord(costOpts[i]) ? costOpts[i] : null;
		const fallback = defaults.severityLevels[i] ?? defaults.severityLevels[0]!;
		severityLevels.push({
			id: `sev_m${i + 1}`,
			timelineLabel: String(tl?.label ?? fallback.timelineLabel),
			costLabel: String(cost?.label ?? fallback.costLabel),
			goalsLabel: String(tier?.label ?? fallback.goalsLabel),
		});
	}

	const probOpts = Array.isArray(src.probOpts) ? src.probOpts : [];
	const probabilityLevels =
		probOpts.length > 0
			? probOpts
					.filter(isPlainRecord)
					.map((p, i) => ({
						id: `prob_m${i + 1}`,
						label: String(p.label ?? `Вер. ${i + 1}`),
					}))
					.filter((p) => p.label)
			: defaults.probabilityLevels;

	const risksRaw = asRisks(src.risks);
	const risks =
		risksRaw ??
		(Array.isArray(src.risks)
			? src.risks
					.filter(isPlainRecord)
					.map((r, i) => ({
						id: String(r.id ?? `risk_${i}`),
						name: String(r.name ?? `Риск ${i + 1}`),
					}))
					.filter((r) => r.name)
			: defaults.risks);

	const base = {
		...defaults,
		severityLevels:
			severityLevels.length > 0 ? severityLevels : defaults.severityLevels,
		probabilityLevels:
			probabilityLevels.length > 0
				? probabilityLevels
				: defaults.probabilityLevels,
		riskCountRanges: asCountRanges(src.riskCountRanges) ?? defaults.riskCountRanges,
		aggregation: asAggregation(src.aggregation),
		adjustment: asAdjustmentSettings(src.adjustment),
		risks: risks.length > 0 ? risks : defaults.risks,
	};
	return resizeUncertaintyMatrix(base);
}

export function isOverallUncertaintyConfigLogicRule(
	rule: V2LogicRuleDto,
): boolean {
	if (rule.id === V2_OVERALL_UNCERTAINTY_CONFIG_RULE_ID) return true;
	const payload = rule.payload;
	return (
		isPlainRecord(payload) &&
		payload.role === V2_OVERALL_UNCERTAINTY_CONFIG_PAYLOAD_ROLE
	);
}

export function parseOverallUncertaintyConfigFromLogic(
	rules: readonly V2LogicRuleDto[] | undefined,
): V2OverallUncertaintyConfig {
	const defaults = createDefaultOverallUncertaintyConfig();
	const rule = (rules ?? []).find(isOverallUncertaintyConfigLogicRule);
	const payload = rule?.payload;
	if (!isPlainRecord(payload)) return defaults;

	const src = isPlainRecord(payload.config) ? payload.config : payload;
	const version = Number(src.version);

	if (version < 2 || (!src.severityLevels && src.tiers)) {
		return migrateV1Config(src);
	}

	const severityLevels =
		asSeverityLevels(src.severityLevels) ?? defaults.severityLevels;
	const probabilityLevels =
		asProbabilityLevels(src.probabilityLevels) ?? defaults.probabilityLevels;
	const groups = asGroups(src.groups) ?? defaults.groups;
	const fallbackGroupId = groups[0]?.id ?? "";
	const matrix =
		asMatrix(
			src.matrix,
			severityLevels.length,
			probabilityLevels.length,
			fallbackGroupId,
		) ?? buildDefaultMatrix(severityLevels.length, probabilityLevels, groups);

	return resizeUncertaintyMatrix({
		version: 2,
		severityLevels,
		probabilityLevels,
		groups,
		riskCountRanges:
			asCountRanges(src.riskCountRanges) ?? defaults.riskCountRanges,
		aggregation: asAggregation(src.aggregation),
		adjustment: asAdjustmentSettings(src.adjustment),
		matrix,
		risks: asRisks(src.risks) ?? defaults.risks,
		calculator: asCalculator(src.calculator) ?? undefined,
	});
}

export function buildOverallUncertaintyConfigLogicRule(
	config: V2OverallUncertaintyConfig,
): V2LogicRuleDto {
	return {
		id: V2_OVERALL_UNCERTAINTY_CONFIG_RULE_ID,
		kind: "computed",
		targetPath: "/uncertaintyCalculation",
		dependencies: [],
		condition: true,
		description:
			"Конфигурация модуля «Общая неопределённость» (шкалы, группы, матрица, калькулятор).",
		payload: {
			role: V2_OVERALL_UNCERTAINTY_CONFIG_PAYLOAD_ROLE,
			version: 2,
			config: { ...config, version: 2 },
		},
	};
}

export function mergeOverallUncertaintyConfigIntoLogic(
	rules: V2LogicRuleDto[],
	config: V2OverallUncertaintyConfig,
): V2LogicRuleDto[] {
	const preserved = rules.filter((r) => !isOverallUncertaintyConfigLogicRule(r));
	return [...preserved, buildOverallUncertaintyConfigLogicRule(config)];
}
