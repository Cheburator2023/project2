import { collectAtypicalWorkArrayPaths } from "./v2-atypical-works-logic.util";
import {
	collectExecutorStreamBlocks,
	formatV2StreamBlockSectionTitleFromExecutors,
	resolveTypicalWorkCatalogStreamLabel,
} from "./v2-anketa-section-ui.util";
import { resolveGroupIsActive } from "./v2-group-activation.util";
import {
	V2_MODEL_IMPLEMENTATION_STREAM_CODES,
	V2_MODEL_STREAM_EXECUTOR,
} from "./v2-model-stream-typical-works.constants";
import type { V2StreamBlockExecutor } from "./v2-stream-block-executor.util";
import { collectGeneratedTypicalWorkArrayPaths } from "./v2-typical-work-output-paths.util";

export type V2StreamWorkSummaryRow = {
	streamName: string;
	blockKey: string;
	streamExecutor: string;
	/** Сумма нормативов типовых работ (без коэффициентов трудоёмкости). */
	baseTypicalScore: number;
	/** Сумма итогов типовых (с коэфф.) × множитель алгоритма. */
	adjustedTypicalScore: number;
	deviationPercent: number | null;
	atypicalScore: number;
};

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readByDotPath(
	data: Record<string, unknown>,
	dotPath: string,
): unknown {
	const segments = dotPath.split(".").filter(Boolean);
	let current: unknown = data;
	for (const segment of segments) {
		const obj = readRecord(current);
		if (!obj) return undefined;
		current = obj[segment];
	}
	return current;
}

function roundUp2(value: number): number {
	if (!Number.isFinite(value)) return 0;
	const rounded = Math.ceil(value * 100 - 1e-9) / 100;
	return rounded === 0 ? 0 : rounded;
}

function percentDeviation(base: number, adjusted: number): number | null {
	if (!Number.isFinite(base) || !Number.isFinite(adjusted) || base === 0) {
		return null;
	}
	return Math.round(((adjusted - base) / base) * 10000) / 100;
}

function sumTaskTotals(tasks: unknown[]): number {
	let sum = 0;
	for (const row of tasks) {
		const total = Number(readRecord(row)?.total);
		if (Number.isFinite(total)) sum += total;
	}
	return roundUp2(sum);
}

function countTypicalWorkInstances(item: Record<string, unknown>): number {
	const raw = item.formulaBreakdown;
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return 1;
	const list = (raw as Record<string, unknown>).instanceBreakdown;
	if (!Array.isArray(list)) return 1;
	const count = list.filter(
		(row) => row != null && typeof row === "object" && !Array.isArray(row),
	).length;
	return count > 0 ? count : 1;
}

/** Сумма нормативов типовых работ (без коэффициентов трудоёмкости). */
function sumTypicalBases(tasks: unknown[]): number {
	let sum = 0;
	for (const row of tasks) {
		const item = readRecord(row);
		if (!item) continue;
		const unitBase = Number(item.estimateHoursPerDay);
		if (!Number.isFinite(unitBase)) continue;
		sum += unitBase * countTypicalWorkInstances(item);
	}
	return roundUp2(sum);
}

function sumAtypicalIncluded(tasks: unknown[]): number {
	let sum = 0;
	for (const row of tasks) {
		const item = readRecord(row);
		if (!item || item.includeInCalculation === false) continue;
		const total = Number(item.total);
		if (Number.isFinite(total) && total > 0) {
			sum += total;
			continue;
		}
		const estimate = Number(item.estimateHoursPerDay);
		const coefficient = Number(item.coefficient);
		if (Number.isFinite(estimate) && Number.isFinite(coefficient)) {
			sum += estimate * coefficient;
		}
	}
	return roundUp2(sum);
}

function pathsUnderBlock(paths: readonly string[], blockKey: string): string[] {
	const prefix = `${blockKey}.`;
	return paths.filter((path) => path === blockKey || path.startsWith(prefix));
}

/** Суммы типовых и нетиповых работ по каждому активному стримовому блоку анкеты. */
export function buildExecutorStreamWorkSummaryRows(
	data: Record<string, unknown>,
	uiSchema: unknown,
	typicalScoreMultiplier = 1,
): V2StreamWorkSummaryRow[] {
	const blocks = collectExecutorStreamBlocks(uiSchema);
	if (blocks.length === 0) return [];

	const typicalPaths = collectGeneratedTypicalWorkArrayPaths(uiSchema);
	const atypicalPaths = collectAtypicalWorkArrayPaths(uiSchema);

	return blocks
		.filter((block) => resolveGroupIsActive(block.blockKey, uiSchema, data))
		.map((block) => {
			const typicalInBlock = pathsUnderBlock(typicalPaths, block.blockKey);
			const atypicalInBlock = pathsUnderBlock(atypicalPaths, block.blockKey);

			let typicalBase = 0;
			let typicalWithCoeffs = 0;
			for (const path of typicalInBlock) {
				const rows = readByDotPath(data, path);
				if (!Array.isArray(rows)) continue;
				typicalBase += sumTypicalBases(rows);
				typicalWithCoeffs += sumTaskTotals(rows);
			}

			let atypicalTotal = 0;
			for (const path of atypicalInBlock) {
				const rows = readByDotPath(data, path);
				if (Array.isArray(rows)) atypicalTotal += sumAtypicalIncluded(rows);
			}

			typicalBase = roundUp2(typicalBase);
			typicalWithCoeffs = roundUp2(typicalWithCoeffs);
			atypicalTotal = roundUp2(atypicalTotal);
			const multiplier =
				Number.isFinite(typicalScoreMultiplier) && typicalScoreMultiplier > 0
					? typicalScoreMultiplier
					: 1;
			// База = нормативы без коэфф.; с поправкой = итоги строк (с коэфф.) × коэфф. алгоритма.
			const adjustedTypicalScore = roundUp2(typicalWithCoeffs * multiplier);

			return {
				streamName: formatV2StreamBlockSectionTitleFromExecutors(
					block.streamExecutors,
				),
				blockKey: block.blockKey,
				streamExecutor: block.streamExecutor,
				baseTypicalScore: typicalBase,
				adjustedTypicalScore,
				deviationPercent: percentDeviation(typicalBase, adjustedTypicalScore),
				atypicalScore: atypicalTotal,
			};
		});
}

export type V2StreamAtypicalSubtotal = {
	/** Метка стрима, совпадающая с группировкой типовых работ в панели итогов. */
	streamLabel: string;
	/** Коды стримов всех блоков под этой меткой — для ролевой маскировки оценок. */
	streamExecutors: V2StreamBlockExecutor[];
	atypicalTotal: number;
};

/**
 * Метка блока-стрима в терминах панели итогов: у блока модельных стримов это зонтичный
 * «Модельный стрим», у остальных — метка стрима-исполнителя.
 */
function resolveStreamBlockSubtotalLabel(
	uiSchema: unknown,
	block: { blockKey: string; streamExecutors: readonly string[] },
): string | null {
	const isModelUmbrella = block.streamExecutors.some((code) =>
		(V2_MODEL_IMPLEMENTATION_STREAM_CODES as readonly string[]).includes(code),
	);
	if (isModelUmbrella) return V2_MODEL_STREAM_EXECUTOR;
	return resolveTypicalWorkCatalogStreamLabel(uiSchema, block.blockKey);
}

/**
 * Нетиповые работы каждого блока-стрима под меткой, по которой панель итогов группирует
 * типовые работы. Возвращает все блоки схемы, включая стримы без нетиповых работ.
 */
export function buildAtypicalTotalsByStreamLabel(
	formData: Record<string, unknown> | null | undefined,
	uiSchema: unknown,
	liveFormData?: Record<string, unknown> | null,
): V2StreamAtypicalSubtotal[] {
	const blocks = collectExecutorStreamBlocks(uiSchema);
	if (blocks.length === 0) return [];

	const atypicalPaths = collectAtypicalWorkArrayPaths(uiSchema);
	const readRows = (path: string): unknown[] => {
		const live = liveFormData ? readByDotPath(liveFormData, path) : undefined;
		if (Array.isArray(live) && live.length > 0) return live;
		const stored = formData ? readByDotPath(formData, path) : undefined;
		return Array.isArray(stored) ? stored : [];
	};

	const byLabel = new Map<
		string,
		{ streamExecutors: V2StreamBlockExecutor[]; atypicalTotal: number }
	>();
	for (const block of blocks) {
		const label = resolveStreamBlockSubtotalLabel(uiSchema, block);
		if (!label) continue;
		const entry = byLabel.get(label) ?? {
			streamExecutors: [],
			atypicalTotal: 0,
		};
		for (const code of block.streamExecutors) {
			if (!entry.streamExecutors.includes(code)) {
				entry.streamExecutors.push(code);
			}
		}
		for (const path of pathsUnderBlock(atypicalPaths, block.blockKey)) {
			entry.atypicalTotal += sumAtypicalIncluded(readRows(path));
		}
		byLabel.set(label, entry);
	}

	return [...byLabel].map(([streamLabel, entry]) => ({
		streamLabel,
		streamExecutors: entry.streamExecutors,
		atypicalTotal: roundUp2(entry.atypicalTotal),
	}));
}
