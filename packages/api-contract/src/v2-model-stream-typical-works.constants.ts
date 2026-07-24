import {
	V2_IMPLEMENTATION_STREAM,
	V2_IMPLEMENTATION_STREAM_LABELS,
	type V2ImplementationStreamCode,
} from "./v2-implementation-streams.util";

/** Эталонные id 10 типовых работ модельного стрима (factory registry). */
export const V2_MODEL_STREAM_FACTORY_WORK_IDS = [
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4002",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4003",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4006",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4007",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4008",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4009",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4010",
] as const;

export const V2_MODEL_STREAM_EXECUTOR = "Модельный стрим";

/**
 * Пять модельных стримов-исполнителей (ролевка / implementationStream).
 * Legacy-каталог «Модельный стрим» должен видеть назначения на любой из них.
 */
export const V2_MODEL_IMPLEMENTATION_STREAM_CODES = [
	V2_IMPLEMENTATION_STREAM.KMBKCB,
	V2_IMPLEMENTATION_STREAM.RB,
	V2_IMPLEMENTATION_STREAM.PTITPC,
	V2_IMPLEMENTATION_STREAM.FINMDL,
	V2_IMPLEMENTATION_STREAM.RND,
] as const satisfies readonly V2ImplementationStreamCode[];

export function isV2ModelImplementationStreamCode(
	value: string,
): value is (typeof V2_MODEL_IMPLEMENTATION_STREAM_CODES)[number] {
	return (V2_MODEL_IMPLEMENTATION_STREAM_CODES as readonly string[]).includes(
		value,
	);
}

/** DB-имена + коды + legacy-подпись для каталога типовых работ модельного блока. */
export function resolveModelStreamCatalogScopeDbStreams(): readonly string[] {
	const result: string[] = [V2_MODEL_STREAM_EXECUTOR, "Модельные стримы"];
	for (const code of V2_MODEL_IMPLEMENTATION_STREAM_CODES) {
		if (!result.includes(code)) result.push(code);
		const label = V2_IMPLEMENTATION_STREAM_LABELS[code];
		if (label && !result.includes(label)) result.push(label);
	}
	return result;
}

/** Всегда показываются в блоке типовых работ и в «Подробном расчёте». */
export const V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS: ReadonlySet<string> = new Set([
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4003",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4008",
]);

/** Всегда активны (формула считается даже без явных триггеров). */
export const V2_MODEL_STREAM_ALWAYS_ACTIVE_WORK_IDS: ReadonlySet<string> = new Set([
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001",
	"f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
]);

const MODEL_STREAM_WORK_ORDER = [
	/^01[\.\s]/i,
	/^02[\.\s]/i,
	/^04[\.\s]/i,
	/^05a[\.\s]/i,
	/^05[\.\s]/i,
	/^automl:\s*разработка/i,
	/^05b[\.\s]/i,
	/^07[\.\s]/i,
	/^09[\.\s]/i,
	/^automl:\s*внедрение/i,
	/постановка задачи/i,
	/поиск данных/i,
	/построение витрины для разработки/i,
	/разработка пилотной модели/i,
	/разработка модели/i,
	/пилотирование модели/i,
	/разработка витрины для применения/i,
	/адаптация и внедрение/i,
] as const;

export function isModelStreamAlwaysShownWork(workId: string): boolean {
	return V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS.has(workId);
}

export function isModelStreamAlwaysActiveWork(workId: string): boolean {
	return V2_MODEL_STREAM_ALWAYS_ACTIVE_WORK_IDS.has(workId);
}

/** Порядок строк модельного стрима в итоговой оценке (01 → … → AutoML: внедрение). */
export function compareModelStreamTypicalWorkNames(a: string, b: string): number {
	const rank = (name: string): number => {
		const trimmed = name.trim();
		for (let index = 0; index < MODEL_STREAM_WORK_ORDER.length; index++) {
			if (MODEL_STREAM_WORK_ORDER[index]!.test(trimmed)) return index;
		}
		return MODEL_STREAM_WORK_ORDER.length;
	};
	const diff = rank(a) - rank(b);
	if (diff !== 0) return diff;
	return a.trim().localeCompare(b.trim(), "ru");
}

export function sortModelStreamTypicalWorkRows<
	T extends { name?: unknown; workId?: unknown },
>(rows: T[]): T[] {
	return [...rows].sort((left, right) => {
		const leftName =
			typeof left.name === "string" && left.name.trim()
				? left.name.trim()
				: String(left.workId ?? "");
		const rightName =
			typeof right.name === "string" && right.name.trim()
				? right.name.trim()
				: String(right.workId ?? "");
		return compareModelStreamTypicalWorkNames(leftName, rightName);
	});
}

function readFiniteNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value.replace(",", "."));
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function typicalWorkRowCollapseKey(
	row: {
		workId?: unknown;
		name?: unknown;
		taskCode?: unknown;
		sourceName?: unknown;
	},
	options?: { groupBySourceName?: boolean },
): string {
	const workId =
		typeof row.workId === "string" && row.workId.trim()
			? row.workId.trim()
			: "";
	const sourceName =
		typeof row.sourceName === "string" ? row.sourceName.trim() : "";
	const sourceSuffix =
		options?.groupBySourceName && sourceName && !sourceName.startsWith("×")
			? `|src:${sourceName}`
			: "";
	if (workId) return `id:${workId}${sourceSuffix}`;
	return [
		"fb:",
		typeof row.taskCode === "string" ? row.taskCode.trim() : "",
		"|",
		typeof row.name === "string" ? row.name.trim() : "",
		sourceSuffix,
	].join("");
}

export type DedupeTypicalWorkRowsOptions = {
	/** Для стрима «Источники данных»: не склеивать разные объекты-источники. */
	groupBySourceName?: boolean;
};

/**
 * Одна работа — одна строка.
 * Fan-out по источникам/компонентам схлопывается: коэффициент и итог суммируются
 * (множитель = число дублей при исходном коэф. 1).
 */
export function dedupeTypicalWorkRowsByWorkId<
	T extends {
		workId?: unknown;
		name?: unknown;
		taskCode?: unknown;
		coefficient?: unknown;
		total?: unknown;
		estimateHoursPerDay?: unknown;
		coefficientDisplay?: unknown;
		sourceName?: unknown;
		reason?: unknown;
		formulaBreakdown?: unknown;
	},
>(rows: T[], options?: DedupeTypicalWorkRowsOptions): T[] {
	const groups = new Map<string, T[]>();
	const order: string[] = [];

	for (const row of rows) {
		const key = typicalWorkRowCollapseKey(row, options);
		if (!key || key === "fb:|" || key === "fb:||") {
			const uniqKey = `uniq:${order.length}`;
			order.push(uniqKey);
			groups.set(uniqKey, [row]);
			continue;
		}
		if (!groups.has(key)) {
			groups.set(key, []);
			order.push(key);
		}
		groups.get(key)!.push(row);
	}

	return order.map((key) => {
		const group = groups.get(key) ?? [];
		const first = group[0]!;
		if (group.length <= 1) return first;

		let coefficientSum = 0;
		let totalSum = 0;
		let hasCoeff = false;
		let hasTotal = false;
		for (const row of group) {
			const coeff = readFiniteNumber(row.coefficient);
			if (coeff != null) {
				coefficientSum += coeff;
				hasCoeff = true;
			}
			const total = readFiniteNumber(row.total);
			if (total != null) {
				totalSum += total;
				hasTotal = true;
			}
		}

		const multiplier = group.length;
		const base = readFiniteNumber(first.estimateHoursPerDay);
		const nextTotal =
			hasTotal
				? totalSum
				: hasCoeff && base != null
					? base * coefficientSum
					: undefined;
		const prevBreakdown =
			first.formulaBreakdown &&
			typeof first.formulaBreakdown === "object" &&
			!Array.isArray(first.formulaBreakdown)
				? (first.formulaBreakdown as Record<string, unknown>)
				: null;
		const next: T = {
			...first,
			...(hasCoeff ? { coefficient: coefficientSum } : {}),
			...(nextTotal != null ? { total: nextTotal } : {}),
			coefficientDisplay:
				typeof first.coefficientDisplay === "string" &&
				first.coefficientDisplay.trim() &&
				multiplier === 1
					? first.coefficientDisplay
					: `×${hasCoeff ? String(coefficientSum).replace(".", ",") : multiplier}`,
			sourceName: `×${multiplier}`,
			reason:
				typeof first.reason === "string" && first.reason.includes(":")
					? first.reason.replace(/^[^:]+:\s*/, "Сводно: ")
					: first.reason,
			...(prevBreakdown
				? {
						formulaBreakdown: {
							...prevBreakdown,
							...(hasCoeff ? { coefficient: coefficientSum } : {}),
							...(nextTotal != null ? { total: nextTotal } : {}),
							expanded:
								base != null && hasCoeff && nextTotal != null
									? `${base} × ${coefficientSum} = ${nextTotal} (×${multiplier})`
									: prevBreakdown.expanded,
						},
					}
				: {}),
		};
		return next;
	});
}

/** Строка модельного стрима для «Подробного расчёта»: только с ненулевым итогом. */
export function isModelStreamTypicalWorkVisibleInSummary(row: {
	total?: unknown;
}): boolean {
	if (row.total == null || row.total === "") return false;
	const num =
		typeof row.total === "number"
			? row.total
			: typeof row.total === "string" && row.total.trim()
				? Number(row.total.replace(",", "."))
				: Number.NaN;
	return Number.isFinite(num) && num > 0;
}
